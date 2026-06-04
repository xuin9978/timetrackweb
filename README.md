<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1F-02r0RKfpXp8b8DTFT1pTQQaQzUPMmN

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Project Notes

- Framework/build: Vite + React + TypeScript, using npm (`package-lock.json` is present).
- Main entry path: `index.html` -> `index.tsx` -> `App.tsx`.
- Core UI lives in `components/`; shared types and services live in `types.ts` and `utils/`.
- Supabase client and data services live in `utils/supabaseClient.ts`, `utils/eventService.ts`, and `utils/tagService.ts`.
- Supabase schema/RLS files live in `supabase/` plus the root `supabase-rls-policies.sql` files.

## Commands

- `npm install`: install dependencies.
- `npm run dev`: start the local Vite dev server.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: preview the production build locally.

There are currently no `test`, `lint`, or `typecheck` npm scripts.

## Maintenance

See [AGENTS.md](AGENTS.md) and [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) for the Codex/AI-agent project map, high-risk files, validation checklist, and modification boundaries.
