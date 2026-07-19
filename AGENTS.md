# AGENTS.md

## Project Overview

This repository is a Vite + React + TypeScript calendar app named `ios-26-liquid-calendar`.
It provides an iOS-style calendar experience with day/week/month views, event creation and editing, tag management, history views, stopwatch/timer logging, PWA metadata, local offline cache/backup behavior, and optional Supabase-backed authentication and sync.

The app is primarily frontend code. Supabase is used from the browser through the public anon key for auth, `events`, and `tags`.

## Repository Layout

- `App.tsx`: main application shell and state coordinator. Owns active module, auth session, events, tags, sync status, alarm state, modal state, and most create/update/delete handlers.
- `index.tsx`: React mount point. Also handles PWA mode class detection and global filtering for noisy aborted network errors.
- `index.html`: Vite HTML entry. Contains PWA meta tags, Tailwind CDN loading, font links, and a large amount of global CSS for layout, dark mode, PWA safe areas, calendar, and alarm UI.
- `types.ts`: shared TypeScript types for tags, events, view modes, modal config, alarm state, and log-session modal config.
- `components/`: React UI components for calendar, time grid, modals, sidebar, history, alarm, icons, and shared visual wrappers.
- `utils/`: shared services and helpers.
  - `supabaseClient.ts`: creates the Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  - `eventService.ts`: Supabase CRUD, visible-range fetching, local event cache fallback, and category clearing/restoration.
  - `tagService.ts`: Supabase tag CRUD, ordering, pagination, and local tag cache/order fallback.
  - `dateUtils.ts`: calendar generation, event splitting, date/time formatting, color helpers, and initial guest data.
  - `timezoneUtils.ts`: timezone-safe date helpers and diagnostics.
  - `dataBackupService.ts`: localStorage event backup/restore helpers.
  - `promptSystem.ts`: structured prompt parsing/response helper.
- `supabase/`: SQL schema/migration files for `events`, `tags`, category, order column, indexes, and RLS.
- `public/`: static public assets directory. Currently appears empty.
- `chrome-extension/`: extension-related directory. Currently only contains an `icons/` directory in this checkout.
- Root `check-*`, `debug-*`, and `test-*` files: ad hoc diagnostics and logic checks. They are not wired into `package.json` scripts.
- `dist/`: generated Vite build output. Do not edit manually.
- `node_modules/`: installed dependencies. Do not edit manually.
- `.vercel/`: Vercel local project metadata. Do not edit casually.
- `.env`, `.env.local`: local environment files. Do not read into logs or edit casually.

## Key Entry Points

- App bootstrap: `index.html` -> `index.tsx` -> `App.tsx`.
- Calendar UI: `components/Calendar.tsx`, `components/TimeGrid.tsx`, `components/DayCell.tsx`, `components/EventPanel.tsx`, `components/MiniCalendar.tsx`.
- Calendar/event logic: `utils/dateUtils.ts`, `utils/eventService.ts`, `types.ts`.
- Alarm/timer flow: `components/Alarm.tsx`, `components/TimerSetupModal.tsx`, `components/LogSessionModal.tsx`, plus alarm/log handlers in `App.tsx`.
- Auth flow: `components/AuthModal.tsx`, `components/AccountModal.tsx`, `utils/supabaseClient.ts`, auth handlers in `App.tsx`.
- Tags/history/settings: `components/History.tsx`, `components/CreateTagModal.tsx`, `components/TagManagerModal.tsx`, `components/SettingsModal.tsx`, `utils/tagService.ts`, `utils/dataBackupService.ts`.
- PWA/deploy metadata: `manifest.json`, `index.html`, `vercel.json`.

## Development Commands

The package manager is npm. `package-lock.json` is present, so prefer npm commands.

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`
- Preview production build: `npm run preview`

Currently defined npm scripts:

- `dev`: `vite`
- `build`: `vite build`
- `preview`: `vite preview`

There are no `test`, `lint`, or `typecheck` scripts in `package.json` at the time of this note. For a lightweight TypeScript check, `npx tsc --noEmit` may be useful, but it is not currently an npm script.

## Environment Variables

Environment is loaded by Vite from `.env` and `.env.local` through `vite.config.ts`.

- `VITE_SUPABASE_URL`: Supabase project URL used by `utils/supabaseClient.ts`.
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key used by the browser client.
- `GEMINI_API_KEY`: exposed in Vite `define` as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

Never paste real values into code, docs, logs, commits, or PR text. If a future task needs secrets, ask for them through environment variables.

## Supabase Notes

- The browser client is optional. If Supabase env vars are missing or too short, `supabase` is `null` and the app uses guest/local behavior where supported.
- Tables represented in SQL files:
  - `public.events`: `id`, `user_id`, `title`, `start_time`, `end_time`, `category`, `created_at`.
  - `public.tags`: `id`, `user_id`, `label`, `color`, `icon`, `order`, `created_at`.
- RLS policies restrict `select`, `insert`, `update`, and `delete` to `auth.uid() = user_id`.
- SQL files exist both under `supabase/` and as root-level RLS helper scripts. Treat them as high-risk schema/auth artifacts.
- Do not modify SQL, RLS policies, auth behavior, or migration naming without explicit user confirmation.

## Agent Working Rules

- Keep diffs small, reviewable, and consistent with the existing style.
- Search the repo before assuming file paths, APIs, or conventions.
- Do not move, rename, delete, or reorganize business files during documentation-only tasks.
- Do not casually move root `check-*`, `debug-*`, or `test-*` files. Before moving any of them, search references in source, docs, HTML, package scripts, and external workflow notes.
- Do not add telemetry, analytics, new network calls, or dependency upgrades unless requested.
- Preserve current Supabase auth/session behavior and local cache/backup behavior unless the user explicitly asks for a change.
- Changes involving Supabase, auth, calendar behavior, alarm/session logging, sync/cache behavior, or deployment must be handled as separate explicit tasks.
- For behavior changes, add or update the closest available check. If no formal test exists, document the manual or ad hoc validation used.
- Prefer npm because this repo has `package-lock.json`.
- Avoid logging secrets. Existing diagnostic scripts should only report whether env vars are configured or masked.
- Current build warnings about missing `/index.css`, mixed static/dynamic `dateUtils.ts` imports, and bundle size are known non-blocking issues. Do not automatically attribute them to future documentation-only changes.
- Do not edit `dist/`, `node_modules/`, or `.vercel/`.

## Engineering Guardrails

Before analyzing or editing code involving Supabase Auth, user profiles, avatars, `user_metadata`, JWTs, sessions, or profile synchronization, read this file completely:

- `docs/engineering-guardrails/supabase-auth-metadata.md`

After related changes, run every regression check required by that document. Unrelated tasks do not need to load it.

## Root Script And Scratch File Index

These root-level files are not currently wired into `package.json` scripts. Treat them as manually run diagnostics, historical checks, or project notes unless a future task confirms otherwise.

| File | Category | Purpose | Risk |
| --- | --- | --- | --- |
| `check-data-integrity.js` | Development check script | Checks Supabase event/user data integrity using env-loaded Supabase credentials. | Medium: queries Supabase and depends on env setup. |
| `check-supabase-status.js` | Development check script | Checks Supabase URL accessibility and auth endpoint status without printing secrets. | Medium: touches external Supabase endpoints. |
| `test-supabase-connection.js` | Development check script | Tests Supabase client setup, session, and sample `events`/`tags` queries. | Medium: depends on env and live Supabase state. |
| `debug-supabase.cjs` | One-off debug script | Debugs Supabase connection and manually reads `.env.local` when needed. | Medium-high: moving it can break `__dirname` env lookup. |
| `test-auth.html` | Temporary/manual test file | Standalone browser page for Supabase auth testing. | Medium: may be opened manually and stores test values in localStorage. |
| `tests/test-calendar-logic.ts` | Temporary test file | Manual check for month-to-day calendar date selection behavior. | Low-medium: imports app types/helpers by relative path. |
| `tests/test-month-events-mapping.ts` | Temporary test file | Manual check for month view event mapping. | Low-medium: imports app types/helpers by relative path. |
| `test-time-segment-logic.ts` | Development check script | Assertion-style checks for event duration presentation, cross-day splitting, and overlap layout. Current local test fails before moving; keep at root and handle separately. | Medium: useful coverage for calendar logic; moving requires import updates. |
| `tests/test-visible-range-coverage.ts` | Development check script | Logs visible date ranges for day/week/month views. | Medium: useful coverage for calendar range behavior. |
| `tests/test-timezone-fix.js` | Temporary test file | Manual timezone/date comparison diagnostic. | Low: standalone historical check. |
| `test-alarm-sync.js` | Temporary test file | Simulates alarm finish/session logging into event data. | Medium: relates to alarm/calendar boundary logic. |
| `tests/test-alarm-sync.cjs` | Temporary test file | CommonJS variant of the alarm/session simulation. | Medium: may exist for runtime compatibility. |
| `IconPreview.tsx` | Needs human confirmation | Appears to be an icon preview/experiment component; no source import was found in the current pass. | Medium: may be manually used. |
| `today-events-display-issue-analysis.md` | One-off analysis note | Historical analysis of a today-events display issue. | Low: documentation only. |
| `metadata.json` | Needs human confirmation | Project metadata, likely from an external/AI Studio flow; no source import was found in the current pass. | Medium: may be used by external tooling. |
| `非AI版 PRD.md` | Product/reference document | PRD/reference material, not runtime code. | Low: keep discoverable. |

## Do Not Edit Casually

- `.env`, `.env.local`, and any future `.env*` files.
- `supabase/*.sql`, `supabase/migrations/*.sql`, `supabase-rls-policies.sql`, `supabase_rls_policies.sql`.
- `utils/supabaseClient.ts`, `utils/eventService.ts`, and `utils/tagService.ts` unless the task is explicitly about sync/auth/data behavior.
- `App.tsx` for broad state, auth, sync, event, tag, alarm, and modal behavior.
- `index.html` global CSS/PWA metadata unless the task is explicitly UI/PWA styling.
- `vercel.json`, `.vercel/`, `.vercelignore`.
- `dist/`, `node_modules/`, generated artifacts, and dependency lock changes unless intentionally rebuilding/installing.
- Root diagnostic files such as `check-*`, `debug-*`, `test-*` unless the task is about those scripts.
- Build warning cleanup unless the task is explicitly about build hygiene or performance.

## Validation Checklist

After any code change:

1. Run `npm run build`.
2. If TypeScript behavior changed, consider `npx tsc --noEmit`.
3. If Supabase behavior changed, run only the relevant diagnostic script and avoid printing secrets.
4. If calendar/date logic changed, run the relevant root `test-*.ts` or `test-*.js` check manually and record the command.
5. If UI changed, start `npm run dev` and inspect the affected flow in browser.
6. If only docs changed, `npm run build` is usually enough to confirm the repo still compiles.
