# MangaTranslator React/Vite Rebuild Plan

## Summary
Rebuild MangaTranslator from the new prototype as the source of truth, using React/Vite for the frontend and a local Node backend for filesystem, import, project storage, OpenRouter, image preparation, exports, and later PDF support.

The previous implementation is preserved in `legacy-v1/`. The full design prototype/design canvas is preserved in `design-reference/`. The root project is now the production app.

## Key Decisions
- Frontend stack: React + Vite.
- Backend stack: local Node HTTP server with SQLite project state.
- Default workspace root: `~/Documents/MangaTranslator`.
- Project model: one folder per project inside the workspace root.
- Import priority: images, folders, ZIP/CBZ first; PDF is surfaced in the UI and handled as a follow-up importer.
- OpenRouter account state: use key/account info from `/api/v1/key` when available; do not require management-key credit endpoints.
- Typesetting: placeholder only for this pass.

## Implementation Shape
- Production route renders the actual app only, not the design canvas.
- Keep the prototype visual system: dark chrome, page strip, real image viewer, workbench, chat column, modal system.
- Reuse lessons from `legacy-v1/`: local config, OAuth/API key fallback, OpenRouter model list/chat streaming, SQLite persistence, image cache, ZIP/CBZ import, Markdown export.
- Project Decisions are minimal but real: names/terms, honorifics, SFX treatment, tone/style notes.

## Test Plan
- Build: `npm run build`.
- Backend syntax: `node --check server/index.js`.
- Smoke: `npm run test:smoke`.
- Browser: verify production app renders without design canvas, modals open, layout fits, and imported images render.
- Import: verify loose image upload, ZIP, CBZ, and local path/folder import.
- Persistence: restart and reopen the active project.
- Export: current page and whole project Markdown.

