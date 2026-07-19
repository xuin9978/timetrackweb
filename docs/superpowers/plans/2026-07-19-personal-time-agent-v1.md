# Personal Time Agent V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for task execution and superpowers:verification-before-completion before reporting completion. Analysis subtasks must use superpowers:brainstorming and remain read-only.

**Goal:** Upgrade the chat page from generic LLM chat into an explainable personal time Agent that uses layered calendar context, layered diary context, and context source indicators.

**Architecture:** The frontend builds a `clientContext` from already-loaded app state and user diary records, then sends it to `/api/chat`. The backend validates and compresses that context into a stable prompt section while the UI displays `used`, `missing`, and `confidence` source indicators for each assistant response.

**Tech Stack:** Vite, React, TypeScript, date-fns, Supabase browser client, serverless `/api/chat`, DeepSeek/OpenAI-compatible chat completions.

## Global Constraints

- Follow `聊天/AI聊天Agent第一版PRD.md`.
- Do not add database tables, migrations, RLS changes, or chat persistence in V1.
- Do not expose API keys, request headers, full diary originals, or complete request bodies in UI/logs.
- Do not automatically create, update, delete events, or save long-term memories.
- Prefer frontend-provided context in V1; do not implement service-side Supabase JWT data reads.
- Run `npm run build` before claiming completion.

---

## Phase 1: Parallel Read-Only Analysis

Dispatch four read-only subagents in parallel:

- Calendar Context Analyst: inspect calendar event/tag shapes and recommend `todayEvents`, `weekEvents`, `monthSummary`, `allTimeSummary`.
- Diary Context Analyst: inspect diary service/component and recommend `recentSevenDays`, `monthSummary`, `allTimeSummary`.
- Backend Prompt Analyst: inspect chat API/SSE path and recommend context validation, prompt construction, and `contextSources`.
- Chat UI Analyst: inspect chat UI and recommend source chips, quick prompts, empty/error states.

Each analyst must return: findings, recommended interfaces, risks, test suggestions, and non-goals.

## Phase 2: Interface Lock

Lock these V1 interfaces before coding:

```ts
type ContextConfidence = 'high' | 'medium' | 'low';

interface ContextSources {
  used: string[];
  missing: string[];
  confidence: ContextConfidence;
}

interface ChatClientContext {
  currentDate: string;
  timezone: string;
  calendarContext: {
    todayEvents: CalendarContextEvent[];
    weekEvents: CalendarContextEvent[];
    monthSummary: CalendarSummary;
    allTimeSummary: CalendarSummary;
  };
  diaryContext: {
    recentSevenDays: DiaryContextEntry[];
    monthSummary: DiarySummary;
    allTimeSummary: DiarySummary;
  };
  contextSources: ContextSources;
}
```

## Phase 3: Implementation Tasks

### Task 1: Shared Context Types And Request Protocol

**Files:**
- Modify: `utils/chatService.ts`
- Modify: `server/llmChat.ts`

**Deliverable:** Shared TypeScript interfaces for `ChatClientContext`, `ContextSources`, and a `/api/chat` request body that accepts `messages`, `quality`, and `clientContext`.

**Verification:** `npm run build`.

### Task 2: Calendar Layered Context

**Files:**
- Modify: `components/Chat.tsx`
- Modify: `App.tsx`

**Deliverable:** Chat receives `events`, `tags`, and current date, then builds today/week detailed events plus month/all-time summaries. Month and all-time summaries must be aggregate-only.

**Verification:** `npm run build`.

### Task 3: Diary Layered Context

**Files:**
- Modify: `components/Chat.tsx`
- Modify: `App.tsx` if `userId` needs to be passed

**Deliverable:** Chat fetches diary records for the signed-in user using existing diary service helpers and builds recent-seven-days details plus month/all-time summaries. Recent details may include short snippets; month/all-time must be aggregate summaries.

**Verification:** `npm run build`.

### Task 4: Backend Prompt Uses Context

**Files:**
- Modify: `utils/chatService.ts`
- Modify: `server/llmChat.ts`
- Modify: `api/chat.ts` only if request/response handling requires it
- Modify: `vite.config.ts` only if local middleware needs matching handling

**Deliverable:** Backend converts `clientContext` into a compact prompt section. The system prompt must require the model to distinguish facts, statistics, and inferences, avoid fabricating missing data, and avoid claiming it modified events or memories.

**Verification:** `npm run build`.

### Task 5: Source Indicator UI

**Files:**
- Modify: `components/Chat.tsx`

**Deliverable:** Each assistant response displays context source indicators for used data, missing data, and confidence. V1 may compute this indicator on the frontend from the request context.

**Verification:** `npm run build`.

### Task 6: Final Verification And Demo Checklist

**Files:**
- Modify docs only if a short demo note is useful.

**Deliverable:** Verify build and prepare demo prompts:
- “帮我安排今天的优先级”
- “复盘最近状态和长期模式”
- “看看这周有没有过载”
- “我长期的时间使用有什么问题”

**Verification:** `npm run build`, plus manual review of no-secret/no-full-diary behavior in changed code.

## Phase 4: Review Gates

- After each implementation task, review the diff for PRD compliance, privacy boundaries, and build result.
- At final review, check: no API key exposure, no full diary history sent as raw text, no source hallucination, source indicators visible, and no database/RLS changes.
