# Chat History Persistence V1 Implementation Plan

> Source spec: `聊天/个人时间Agent聊天记录持久化计划.md`

## Goal

Implement session-level memory for the Personal Time Agent by persisting chat sessions and messages. Logged-in users use Supabase cloud persistence; logged-out users and cloud failures use localStorage fallback. This version does not implement long-term memory, user profiles, RAG, tool calls, or schedule-writing actions.

## Locked Product Decisions

- Data layer: Supabase persistence + localStorage fallback.
- Layout: chat-only history sidebar between the global nav and chat content, width about 260px.
- Mobile: history sidebar hidden by default and opened as a drawer.
- List copy: title `历史`, button `新对话`, search placeholder `搜索历史`.
- Empty history: no empty-state text; search without results shows `没有找到相关历史`.
- Session list: title + relative updated time; title is single-line ellipsis.
- Session title: generated from first user message, supports manual rename via modal.
- Session actions: hover more menu with rename, delete, pin/unpin; mobile may show more button persistently.
- Delete: custom confirmation modal; no single-message deletion.
- Pinning: max 4 pinned sessions; pinned sessions sort before normal sessions; no section headings, only a small pin marker.
- Search: title + message content keyword search; local search immediate, cloud search debounced by 300ms.
- Cloud search scope: recent 50 cloud sessions; no load-more in V1.
- Local guest sessions: keep recent 10.
- Logged-in list: merge cloud sessions and local sessions, sorted by pin then updated time.
- Cloud save failure: fallback to localStorage, show toast, and mark session `未同步`.
- Context sent to model: current session recent 20 messages only.
- Assistant message persistence: save complete message after stream finishes; do not save partial assistant output.
- Assistant source indicators: persist `contextSources` summary only, not full calendar/diary context.

## Non-Goals

- No long-term memory or user profile.
- No automatic preference extraction.
- No vector search or semantic recall.
- No cross-session context injection into model requests.
- No full calendar/diary context snapshots in chat history.
- No automatic migration of guest local sessions after login.
- No changes to existing `events`, `tags`, or `diary_entries` RLS.

## Phase 1: Database Migration

Create `supabase/migrations/20260719_create_chat_history.sql`.

Schema:

- `chat_sessions`
  - `id uuid primary key`
  - `user_id uuid not null`
  - `title text not null`
  - `pinned boolean not null default false`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- `chat_messages`
  - `id uuid primary key`
  - `session_id uuid not null`
  - `user_id uuid not null`
  - `role text not null check (role in ('user', 'assistant'))`
  - `content text not null`
  - `context_sources jsonb`
  - `created_at timestamptz not null default now()`

Add indexes:

- sessions by `user_id`, `pinned`, `updated_at`
- messages by `session_id`, `created_at`
- messages by `user_id`, `created_at`

RLS:

- enable RLS on both tables
- users can select/insert/update/delete only their own sessions
- users can select/insert/delete only their own messages
- message access must be constrained by both `user_id = auth.uid()` and ownership of the parent session

Validation:

- inspect SQL for no `service_role`
- do not modify existing migrations

## Phase 2: Chat History Service

Create `utils/chatHistoryService.ts`.

Types:

- `ChatSessionRecord`
- `ChatMessageRecord`
- `ChatStorageScope = 'cloud' | 'local' | 'unsynced'`
- `ChatHistoryContextSources`

Functions:

- `listChatSessions(userId?: string)`
- `createChatSession(input)`
- `renameChatSession(sessionId, title)`
- `deleteChatSession(sessionId)`
- `setChatSessionPinned(sessionId, pinned)`
- `fetchChatMessages(sessionId)`
- `saveChatMessage(input)`
- `searchChatSessions(query, userId?)`
- localStorage helpers for guest and fallback sessions
- utilities for title generation, relative sorting, and trimming local sessions to 10

Rules:

- cloud sessions load recent 50
- local sessions load recent 10
- merged sessions sort pinned first, then `updated_at` descending
- search cloud sessions within recent 50 sessions
- search local sessions within local 10 sessions
- cloud failure during save falls back to local and returns `storageScope: 'unsynced'`
- never log message content, JWT, request headers, or full context payloads

Tests:

- create `tests/test-chat-history-service.ts`
- cover title generation, local trimming to 10, pin limit 4, sorting, search, and context source preservation

## Phase 3: Chat Component Integration

Modify `components/Chat.tsx`.

State:

- `sessions`
- `activeSessionId`
- `messages`
- `searchQuery`
- `isHistoryOpen`
- `renameTarget`
- `deleteTarget`
- `historyError`
- `syncNotice`

Behavior:

- on load, fetch cloud + local sessions and restore most recent session
- `新对话` clears messages and active session without creating an empty session
- first user message creates the session
- save user message before calling model
- request model using active session recent 20 messages plus latest user message
- save assistant message only after stream completes
- delete session after custom confirmation
- rename via modal
- pin/unpin with max 4 pinned sessions
- cloud save failure falls back to local, shows toast/notice, and marks session

Preserve existing behavior:

- calendar context
- diary context
- DeepSeek quick/deep chat mode
- source summary chip
- no automatic schedule mutation

## Phase 4: History Sidebar UI

Modify `components/Chat.tsx`; extract smaller subcomponents only if the file becomes hard to read.

Desktop layout:

```text
global nav | 260px history sidebar | chat content
```

History sidebar:

- title: `历史`
- button: `新对话`
- search input placeholder: `搜索历史`
- list item: title, relative updated time, optional `本机` / `未同步` / pin marker
- more menu: rename, delete, pin/unpin
- no empty-state text when there are no sessions
- search empty state: `没有找到相关历史`

Mobile:

- hide history sidebar by default
- show history button in chat content
- open drawer with the same controls
- close drawer after selecting a session

Modals:

- rename modal with input and save/cancel
- delete confirmation modal with cancel/delete

## Phase 5: Request Context Rules

Modify `components/Chat.tsx` and `utils/chatService.ts` only if needed.

Rules:

- send only current session recent 20 messages
- do not include messages from other sessions
- do not include all historical messages
- keep dynamic calendar/diary context generated at send time
- avoid duplicate latest user message in the request payload

## Phase 6: Verification

Automated:

```bash
npx tsx tests/test-chat-history-service.ts
npx tsc --noEmit
npm run build
```

Manual:

- logged-out user creates 11 sessions, only recent 10 remain
- logged-out search finds title and message content
- logged-in user creates cloud session and refreshes page; session restores
- logged-in list shows cloud and local sessions together
- new conversation does not create an empty session until first send
- rename persists after refresh
- delete requires confirmation and removes messages
- pin max 4 sessions
- search no result shows `没有找到相关历史`
- assistant source summary survives session reload
- cloud save failure fallback shows toast and `未同步`
- model receives recent 20 messages from active session only

## Risks

- `components/Chat.tsx` may become too large; extract local subcomponents if needed.
- Supabase RLS must be exact; avoid broad policies.
- Search over message content is limited to recent 50 sessions to avoid expensive queries.
- localStorage fallback must not imply cloud sync.
- Chat content is private; do not log it in diagnostics.

## Completion Criteria

- Build passes.
- TypeScript passes.
- Chat history service tests pass.
- SQL migration exists and is scoped only to chat history.
- UI supports history sidebar, search, rename, delete, pin, mobile drawer.
- Refresh restores conversation.
- Current session recent 20 messages are used for model context.
- No long-term memory is created.
