# Project Map

This map is for maintainers and AI coding agents who need to quickly locate behavior without changing project structure.

## Structure At A Glance

```text
.
├── App.tsx                         # Main React app/state coordinator
├── index.tsx                       # React mount + PWA mode/global error filtering
├── index.html                      # Vite HTML entry + global CSS/PWA metadata
├── types.ts                        # Shared domain types
├── vite.config.ts                  # Vite config, env mapping, React plugin, alias
├── package.json                    # npm scripts and dependencies
├── components/                     # UI components and modals
├── utils/                          # Supabase services, date/time helpers, backups
├── supabase/                       # SQL schema/migration files
├── public/                         # Static public assets
├── chrome-extension/               # Extension-related assets placeholder
├── dist/                           # Generated build output
├── node_modules/                   # Installed dependencies
└── docs/                           # Project documentation
```

## Main User Flows

### Login And Account

1. User opens auth UI from `components/Sidebar.tsx`.
2. `components/AuthModal.tsx` collects email/password.
3. Auth handlers in `App.tsx` call `supabase.auth.signInWithPassword` or `supabase.auth.signUp`.
4. `App.tsx` subscribes to `supabase.auth.onAuthStateChange`.
5. When `currentUser` exists, events and tags are loaded through `utils/eventService.ts` and `utils/tagService.ts`.
6. Account/sign-out UI is handled by `components/AccountModal.tsx` and sign-out logic in `App.tsx`.

### Calendar

1. `App.tsx` owns `currentDate`, `selectedDate`, `viewMode`, `events`, `tags`, and `visibleTags`.
2. `components/Calendar.tsx` renders the active calendar view and delegates detailed time layout to `components/TimeGrid.tsx`.
3. `utils/dateUtils.ts` calculates visible ranges, generated day data, event splitting across days, time formatting, and event layout helpers.
4. Add/edit actions open `components/AddEventModal.tsx`.
5. Create/update/delete handlers in `App.tsx` call `utils/eventService.ts` when logged in or update local state for guest mode.

### Alarm And Session Logging

1. User switches to alarm from `components/Sidebar.tsx`.
2. `components/Alarm.tsx` renders stopwatch/timer controls using `alarmState` from `App.tsx`.
3. Timer setup is handled by `components/TimerSetupModal.tsx`.
4. Finishing/logging a session opens `components/LogSessionModal.tsx`.
5. `App.tsx` converts the logged session into calendar event data and saves it through the same event creation flow.

### Tags And History

1. `components/History.tsx` displays historical events and tag management entry points.
2. `components/CreateTagModal.tsx` and `components/TagManagerModal.tsx` handle tag creation/editing/ordering.
3. Tag persistence is in `utils/tagService.ts`.
4. `utils/eventService.ts` contains category clearing/restoration helpers used when tags are changed or deleted.

### Sync, Cache, Backup

1. Supabase client setup lives in `utils/supabaseClient.ts`.
2. Event fetch/save/update/delete functions live in `utils/eventService.ts`.
3. Tag fetch/save/update/delete/order functions live in `utils/tagService.ts`.
4. Both event and tag services use `localStorage` cache fallback in some failure/offline paths.
5. Manual or automatic event backup helpers live in `utils/dataBackupService.ts`.
6. `components/SettingsModal.tsx` exposes import/export/restore-oriented settings UI.

### PWA And Extension

1. PWA metadata is in `manifest.json` and `index.html`.
2. PWA standalone mode class handling is in `index.tsx`.
3. `chrome-extension/` exists as an extension-related placeholder directory in this checkout. It currently has an `icons/` directory but no functional extension source files were found during this pass.

## Feature To File Map

| Feature | Start Here | Related Files |
| --- | --- | --- |
| App shell/state | `App.tsx` | `types.ts` |
| Calendar views | `components/Calendar.tsx` | `components/TimeGrid.tsx`, `components/DayCell.tsx`, `components/EventPanel.tsx`, `components/MiniCalendar.tsx` |
| Event create/edit/delete | `App.tsx` | `components/AddEventModal.tsx`, `utils/eventService.ts`, `utils/dateUtils.ts` |
| Event time/date math | `utils/dateUtils.ts` | `utils/timezoneUtils.ts`, `test-time-segment-logic.ts`, `tests/test-calendar-logic.ts` |
| Tags | `utils/tagService.ts` | `components/CreateTagModal.tsx`, `components/TagManagerModal.tsx`, `components/History.tsx` |
| Auth/account | `App.tsx` | `components/AuthModal.tsx`, `components/AccountModal.tsx`, `utils/supabaseClient.ts` |
| Supabase schema/RLS | `supabase/migrations.sql` | `supabase/migrations/*.sql`, `supabase-rls-policies.sql`, `supabase_rls_policies.sql` |
| Alarm/timer | `components/Alarm.tsx` | `components/TimerSetupModal.tsx`, `components/LogSessionModal.tsx`, `App.tsx` |
| Import/export/restore | `components/SettingsModal.tsx` | `utils/dataBackupService.ts`, `utils/eventService.ts` |
| Styling/PWA shell | `index.html` | `manifest.json`, `index.tsx` |
| Deployment routing | `vercel.json` | `.vercelignore`, `.vercel/` |

## Data Flow

```text
User interaction
  -> React component in components/
  -> handler/state in App.tsx
  -> shared helpers in utils/dateUtils.ts or utils/timezoneUtils.ts
  -> Supabase service in utils/eventService.ts or utils/tagService.ts
  -> Supabase client from utils/supabaseClient.ts
  -> public.events / public.tags with RLS by user_id
```

For guest or offline-like paths, `App.tsx` and service helpers may use in-memory React state plus `localStorage` caches/backups.

## Where To Look Before Changing

- Calendar layout, day/week/month display, or event blocks: `components/Calendar.tsx`, `components/TimeGrid.tsx`, `components/DayCell.tsx`, `components/EventPanel.tsx`, then `utils/dateUtils.ts`.
- Event persistence, sync, cache, or cross-day saving: `App.tsx`, `utils/eventService.ts`, `utils/dateUtils.ts`.
- Tags, tag order, tag deletion side effects: `utils/tagService.ts`, `components/History.tsx`, `components/TagManagerModal.tsx`, `components/CreateTagModal.tsx`, then `utils/eventService.ts`.
- Auth/session/account behavior: `App.tsx`, `utils/supabaseClient.ts`, `components/AuthModal.tsx`, `components/AccountModal.tsx`.
- Alarm/session logging: `components/Alarm.tsx`, `components/LogSessionModal.tsx`, `components/TimerSetupModal.tsx`, then the log-session handlers in `App.tsx`.
- Theme, dark mode, global layout, PWA safe areas: `index.html`, `index.tsx`, `App.tsx`, `components/Sidebar.tsx`.
- Supabase schema or RLS: read the SQL files first, but do not edit without confirmation.
- Deployment routing: `vercel.json` and `.vercelignore`.

## Diagnostic And Ad Hoc Check Files

These files look like manual checks, debug pages, or ad hoc tests. They are recorded here only; no files were moved.

- `check-data-integrity.js`: development check script for Supabase data integrity. Risk: medium because it queries Supabase and depends on env variables.
- `check-supabase-status.js`: development check script for Supabase URL/auth endpoint status. Risk: medium because it touches external endpoints.
- `test-supabase-connection.js`: development check script for Supabase client/session/table access. Risk: medium because it depends on live Supabase state.
- `debug-supabase.cjs`: one-off Supabase debug script with manual `.env.local` reading. Risk: medium-high because moving it can break `__dirname` based env lookup.
- `test-auth.html`: temporary/manual Supabase auth test page. Risk: medium because it may be opened directly and uses browser localStorage.
- `tests/test-calendar-logic.ts`: temporary calendar selection logic test. Risk: low-medium because it imports app helpers with relative paths.
- `tests/test-month-events-mapping.ts`: temporary month event mapping test. Risk: low-medium because it imports app helpers with relative paths.
- `test-time-segment-logic.ts`: development check script for event presentation, cross-day splitting, and overlap layout. Current local test fails before moving, so it remains at the root and should be handled separately. Risk: medium because it covers calendar logic and imports app helpers.
- `tests/test-visible-range-coverage.ts`: development check script for visible date ranges. Risk: medium because it covers calendar range behavior.
- `tests/test-timezone-fix.js`: temporary timezone/date diagnostic. Risk: low because it is standalone.
- `test-alarm-sync.js`: temporary alarm-to-event sync simulation. Risk: medium because it touches alarm/calendar boundary assumptions.
- `tests/test-alarm-sync.cjs`: CommonJS variant of the alarm/session simulation. Risk: medium because it may exist for runtime compatibility.
- `IconPreview.tsx`: needs human confirmation; appears to be an icon preview/experiment component. Risk: medium because it may be manually used even though no source import was found.
- `today-events-display-issue-analysis.md`: one-off issue analysis note. Risk: low because it is documentation only.
- `metadata.json`: needs human confirmation; likely external/AI Studio project metadata. Risk: medium because external tooling may expect it at root.
- `非AI版 PRD.md`: product/reference document. Risk: low, but keep discoverable for product context.

Potential future cleanup idea: after confirmation, these could be organized under a `scripts/`, `dev-tools/`, or `tests/` directory and wired to npm scripts. Do not do that in this first-stage documentation pass.

Before moving any of these files, search for references in `package.json`, source imports, `index.html`, `README.md`, `AGENTS.md`, this project map, deployment notes, and any external workflow documentation. If a file imports app code by relative path, update and validate those imports in the same task.

## Directory Status And Boundaries

| Directory | Current responsibility | Boundary notes |
| --- | --- | --- |
| `src/` | Vite type declarations. Currently only `vite-env.d.ts` was found. | Keep as-is for now. Moving app source into `src/` would require broad import and config changes. |
| `components/` | React UI components, feature views, modals, icons, and shared UI wrappers. | Clear UI boundary. Do not mix Supabase schema/auth changes into component cleanup. |
| `utils/` | Supabase services, date/time helpers, backup helpers, timezone helpers, and prompt helper code. | Service code and pure helpers share the same directory. Future splitting needs confirmation because many imports depend on current paths. |
| `supabase/` | SQL schema/migration/RLS files for `events` and `tags`. | High-risk data/auth boundary. Do not edit or reorganize without a dedicated Supabase task. |
| `public/` | Static public assets directory. Currently appears mostly empty in this checkout. | Safe to document, but avoid moving PWA assets without checking `index.html` and `manifest.json`. |
| `chrome-extension/` | Extension-related placeholder/assets area; currently an `icons/` directory was observed. | Needs human confirmation before cleanup because extension packaging may rely on root-relative paths. |
| `dist/` | Generated Vite build output. | Do not edit manually. Build may rewrite it, but it should not be treated as source. |
| `node_modules/` | Installed npm dependencies. | Do not edit manually. Use package manager commands only when dependency work is explicitly requested. |
| `.vercel/` | Vercel local project metadata. | Do not edit casually. Deployment-related changes should be a separate task. |

## Known Non-Blocking Build Warnings

These warnings were observed during `npm run build`. They are current known non-blocking issues and should not be automatically attributed to future documentation-only changes.

- `/index.css` does not exist at build time, but `index.html` references `/index.css`; Vite leaves the link for runtime resolution.
- `utils/dateUtils.ts` is dynamically imported by `components/SettingsModal.tsx` and also statically imported by many app modules, so the dynamic import does not split it into a separate chunk.
- The main JavaScript bundle is larger than Vite's default 500 kB warning threshold after minification.

Do not fix these warnings as part of routine documentation or file-index cleanup. Treat them as separate build hygiene or performance tasks.

## Generated, Dependency, And High-Risk Areas

- Generated/dependency directories: `dist/`, `node_modules/`, `.vercel/`.
- Sensitive local files: `.env`, `.env.local`, any future `.env*`.
- Schema/auth files: `supabase/`, `supabase-rls-policies.sql`, `supabase_rls_policies.sql`.
- Deployment files: `vercel.json`, `.vercelignore`, `.vercel/`.
- Lockfile: `package-lock.json`. Only change when dependencies are intentionally installed or updated.
