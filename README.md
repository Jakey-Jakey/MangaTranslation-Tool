# MangaTranslator

Local-first manga translation workspace with a React/Vite frontend and a local Node backend.

## Start

Use one of the launcher scripts:

- macOS: `scripts/start-mac.command`
- Linux: `scripts/start-linux.sh`
- Windows: `scripts/start-windows.bat`

Or run:

```sh
npm install
npm run build
npm start
```

The production app runs at `http://127.0.0.1:3127`.

For frontend-only development:

```sh
npm run dev
```

## Layout

- `design-reference/`: preserved design prototype and canvas.
- `legacy-v1/`: previous implementation for reference.
- `src/`: production React/Vite frontend.
- `server/`: local backend.
- `planning/`: rebuild plan and deep checklist.

## Workspace

The default workspace root is `~/Documents/MangaTranslator`. Each project gets its own folder containing originals, pages, crops, API image cache, exports, and SQLite project state.

