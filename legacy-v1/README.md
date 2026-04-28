# Manga Translation Tool

A local-first web workspace for manga translation. The app runs a small Node server on your machine, opens in your browser, and stores project data inside the selected workspace.

## Start

Use one of the launcher scripts:

- macOS: `scripts/start-mac.command`
- Linux: `scripts/start-linux.sh`
- Windows: `scripts/start-windows.bat`

The launcher scripts install npm dependencies on first run if `node_modules` is missing, then start the local server and open the app.

Or run:

```sh
npm start
```

The app defaults to `http://127.0.0.1:3127`.

OpenRouter OAuth uses a local callback bridge at `http://localhost:3000`, matching OpenRouter's localhost OAuth recommendation. If OAuth is unavailable, use the in-app API key button.

## Current Slice

- First-launch workspace setup with default or custom folder.
- Folder scanning by local path.
- Drag/drop image and ZIP import into the workspace.
- Translation mode with image viewer, page strip, crop creation, crop queue, chat, and scratchpad.
- Prototype-inspired production shell with page rail, center viewer, line workbench, and right-side translation chat.
- Blank Typesetting mode placeholder.
- OpenRouter OAuth PKCE login, explicit API-key fallback, model list, vision filter, and streaming chat.
- OpenRouter image requests prefer lossless originals; oversized or unsupported local files are converted to high-quality API-compatible JPEG cache copies.
- SQLite project state in `project.sqlite`.
- Per-page and whole-project Markdown export.
- Project-level removal controls for pages, crops, and scratchpad rows. These remove database entries only; imported image files stay on disk.

## Workspace Layout

```txt
workspace/
  project.sqlite
  originals/
  pages/
  crops/
  cache/
    api-images/
  exports/
    pages/
```

## Notes

The app prefers `@openrouter/sdk` when it is installed and falls back to OpenRouter's HTTP-compatible streaming API when it is not available.
