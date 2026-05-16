# MangaTranslator Deep To-Do

## 0. Priority Task Sets

### Set 1: Core Data Model
- [x] Create a first-class structured translation schema for line label, type, source, draft, final, notes, confidence, crop ids, page id, chat pass id, and model metadata.
- [x] Store model responses as structured records linked to page, crop, chat pass, and scratchpad rows.
- [x] Make first-pass "Send to scratchpad" / auto-populate behavior explicit and reversible.
- [x] Add JSON export from the structured translation schema.

### Set 2: Stability And Boundaries
- [x] Add runtime schema validation for API request bodies before writing to SQLite or the filesystem.
- [x] Pin direct dependency versions instead of using `latest` ranges.
- [x] Remove unused dependencies, including `@openrouter/sdk` if the raw HTTP path remains the supported implementation.
- [x] Resolve the transitive `uuid` advisory from `streamdown` / `mermaid` when dependency updates allow it.
- [x] Add immediate validation feedback after manual OpenRouter key save.

### Set 3: App Structure
- [ ] Split `src/main.jsx` into stable workflow modules: viewer, workbench, chat, modals, API client, and parsers.
- [x] Move chat/translation parsing helpers into dedicated parser modules with focused tests.
- [x] Move frontend API helpers into an API/client module with shared response/error handling.
- [x] Evaluate TanStack Query for project/page/status/chat cache, mutations, optimistic updates, and invalidation.
- [x] Evaluate React Hook Form for settings, account, Project Guide, export, and onboarding forms after UI modules are split.

### Set 4: Workbench Workflow
- [x] Add archive/delete controls for chat passes with confirmation.
- [x] Add pass templates: full page pass, crop queue pass, line refinement pass, terminology pass.
- [ ] Render structured first-pass output as editable line cards linked to scratchpad rows.
- [x] Add autosave debounce indicators for scratchpad edits.
- [ ] Add persistent undo/redo for scratchpad edits and chat/context clearing.

### Set 5: Layout And Daily Usability
- [x] Make the Workbench and chat panels horizontally adjustable with draggable splitters.
- [x] Add responsive behavior so Workbench and chat remain reachable below desktop widths.
- [x] Replace remaining native `prompt` / `confirm` dialogs with in-app modal flows.
- [x] Improve empty/import states for no project, empty project, no page, no crops, no scratchpad rows, and no chat.
- [x] Make sent attachments visually distinct from ready-to-send attachments.

### Set 6: Import Pipeline
- [ ] Add import progress for large folders, ZIP, and CBZ jobs.
- [x] Add duplicate import detection or clear duplicate handling.
- [x] Add browser-upload and local-path sample import coverage.
- [ ] Implement PDF rasterization into page images.
- [ ] Implement CBR extraction if a portable extractor is practical.

### Set 7: Testing And QA
- [x] Expand smoke tests beyond "server responds" into project/page/chat/export behavior checks.
- [x] Add Playwright flows for import, crop creation/editing, chat, scratchpad, and export.
- [ ] Add visual regression screenshots for the PDF-derived screens.
- [x] Add fixture projects/images for deterministic tests.

### Set 8: Export And Interop
- [x] Add CSV export.
- [x] Rename Markdown export terminology from Project Decisions to Project Guide.
- [x] Avoid writing secrets to project exports or chat transcripts.
- [x] Add a project cleanup/manage dialog for test projects and stale imports.

### Set 9: Visual Fidelity
- [ ] Tune prototype/PDF visual details after core behavior settles.
- [x] Improve model picker rows with provider avatars, badges, pricing, and selected-state treatment.
- [ ] Match settings/export modal layouts to the prototype.
- [ ] Tune typography and color consistency.
- [x] Polish the typesetting placeholder.

## 1. Planning Artifacts
- [x] Create `planning/`.
- [x] Add rebuild plan.
- [x] Add deep to-do list.
- [x] Record defaults in decision log.

## 2. Project Restructure
- [x] Keep `legacy-v1/` untouched as reference.
- [x] Move prototype files into `design-reference/`.
- [x] Scaffold Vite React app at root.
- [x] Configure scripts: `dev`, `start`, `build`, `preview`, `test:smoke`.
- [x] Add cross-platform launch scripts.

## 3. Frontend Foundation
- [x] Port prototype visual system into production CSS.
- [x] Convert design into production React components.
- [x] Remove browser Babel and CDN React runtime.
- [x] Render production app only.
- [x] Preserve dark theme default, density, and accent hooks.

## 4. Backend Foundation
- [x] Recreate local Node backend.
- [x] Serve Vite build in production.
- [x] Use SQLite for project data.
- [x] Store app config outside project folders.
- [x] Keep secrets local.
- [x] Add safe workspace path handling.

## 5. Workspace And Projects
- [x] Default root: `~/Documents/MangaTranslator`.
- [x] First launch workspace/project setup.
- [x] Allow skipping OpenRouter login.
- [x] Create/open/list projects.
- [x] Copy imports into project by default.
- [x] Preserve work-in-place setting for project metadata.

## 6. Import Pipeline
- [x] Upload image files from browser.
- [x] Import local path.
- [x] Import folders.
- [x] Import ZIP.
- [x] Import CBZ.
- [x] Natural filename sorting.
- [x] Preserve originals.
- [x] Generate page records and dimensions.
- [x] Show clear unsupported PDF/CBR messages.
- [ ] Implement PDF rasterization.
- [ ] Implement CBR extraction if an extractor is available.

## 7. Viewer And Crops
- [x] Render real imported pages.
- [x] Keep select/crop/pan tools.
- [x] Store crop coordinates in natural image dimensions.
- [x] Save crop images into project crop folder.
- [x] Name, select, queue, reorder, and remove crops.
- [x] Send page or queue context.

## 8. Workbench And Scratchpad
- [x] Replace mock rows with project scratchpad rows.
- [x] Autosave label, type, source, draft, final, notes.
- [x] Support S, SFX, N labels.
- [x] Filters: All, Queue, Drafts, Final.
- [x] Copy draft to final.
- [x] Delete with confirmation.
- [x] Ask about selected line by adding contextual prompt.
- [x] Make the Workbench and chat panels horizontally adjustable with draggable splitters.

## 9. Chat And Translation Flow
- [x] Persist chat messages.
- [x] Attach current page, selected crop, or queue.
- [x] Stream model response.
- [x] Parse first-pass translation into structured entries that can be sent to scratchpad.
- [x] Preserve full assistant response.
- [x] Keep prompt output table-free.
- [x] Include language, queue order, labels, and project decisions in context.

## 10. OpenRouter
- [x] OAuth PKCE bridge.
- [x] Manual API key fallback.
- [x] Live model fetching.
- [x] Search/filter model picker.
- [x] Vision-only filter.
- [x] Show context length, modalities, and pricing.
- [x] Fetch current key info from `/api/v1/key`.
- [x] Raw HTTP fallback for chat streaming.

## 11. Settings
- [x] System prompt editor and reset.
- [x] Source/target language settings.
- [x] Workspace/project path display.
- [x] Image quality policy display.
- [x] Account/key state display.
- [x] Shortcuts display.
- [x] Persist settings.

## 12. Project Decisions
- [x] Seed minimal defaults.
- [x] Add/edit/delete rules.
- [x] Save project-wide.
- [x] Include compact summary in model context.
- [x] Include Project Guide rules in Markdown export.
- [x] Promote Project Guide access from tiny workbench icon to top-level chrome button.
- [x] Show Project Guide as a visible chat context chip.
- [x] Keep Project Guide model context compact and capped instead of dumping unlimited rules.
- [ ] Rename backend/database terminology from decisions to project guide/style guide after the data shape settles.

## 13. Export
- [x] Markdown page export.
- [x] Markdown project export.
- [x] Include source, draft, final, notes, crop boxes, and Project Guide rules.
- [x] JSON export.
- [x] CSV export.
- [x] Rename Markdown export terminology from Project Decisions to Project Guide.

## 14. Typesetting Placeholder
- [x] Keep prototype placeholder.
- [x] Preserve future TODOs.

## 15. Quality And Compatibility
- [x] Cross-platform path helpers.
- [x] Originals untouched.
- [x] API-compatible cache copies only.
- [x] Missing files handled with readable errors.
- [ ] Full Windows/Linux manual launch verification.
- [x] Expand smoke tests beyond "server responds" into project/page/chat/export behavior checks.
- [x] Add Playwright flows for import, crop creation/editing, chat, scratchpad, and export.
- [x] Add fixture projects/images for deterministic tests.

## 16. Current Functional Bug Bash
- [x] OpenRouter connect error: document the observed `409 Failed to create or update app while creating auth code` path and make the in-app recovery path obvious.
- [x] Add a local "use legacy OpenRouter key" recovery option when `~/.manga-translation-tool/config.json` contains an existing key.
- [x] Keep manual API-key fallback prominent and explain that OAuth can fail on OpenRouter before the local callback receives anything.
- [x] Send chat button should always provide feedback; it must not silently appear broken when no OpenRouter key is connected.
- [x] Allow sending chat with no typed text when the current page is attached.
- [x] Allow sending chat with no typed text when one crop is attached.
- [x] Allow sending chat with no typed text when the crop queue is attached.
- [x] Composer should disable Send only when there is no text and no attachments, or while streaming.
- [x] When not signed in, pressing Send should open/show account setup instead of doing nothing.
- [x] Make attached-page/crop-only messages display a readable label in chat history.
- [x] Zoom in/out buttons must visibly change page scale.
- [x] Zoom percentage field must be editable and apply on Enter/blur.
- [x] Fit-to-view button must calculate the actual viewer size and fit the current page.
- [x] Zoom should not be clamped to a fixed 900px page width.
- [x] Mouse/trackpad scroll over the image viewer should scroll the canvas normally.
- [x] Modifier-wheel / pinch zoom over the image viewer should zoom around the cursor.
- [x] Pan tool should drag-scroll the image canvas.
- [x] Crop tool must still store coordinates against the natural image dimensions after zoom/pan changes.
- [x] Changing projects must clear stale page/crop/scratchpad/chat state when the new project has no pages.
- [x] Changing projects must load the selected project’s first page when it has pages.
- [x] Image URLs must include a cache-busting project/page key so same relative filenames do not show stale images.
- [x] Replace native blue/white radio selection indicators with prototype-style orange highlighted choice rows.
- [x] Add accessible labels/titles for icon-only buttons so browser automation and users see meaningful names.
- [x] Verify no horizontal layout overflow after the viewer/workbench/chat fixes.
- [x] Replace browser crop label prompt with an in-app inline label editor after crop creation.
- [x] Support Command-Z / Control-Z undo for new crop placement.
- [x] Support Command-Z / Control-Z undo for crop movement and resize edits.

## 17. PDF Prototype Fidelity Audit
- [ ] Overall chrome: match the prototype’s tight top bar, boxed MangaTranslator wordmark, page/project number treatment, and subtler spacing.
- [ ] Mode tabs: active Translation/Typesetting state should match the dark pill treatment from the PDF, not generic segmented controls.
- [ ] Page strip: thumbnails need the prototype’s red/orange active outline, top-right count badge, bottom page/file overlays, compact Add row, and collapse affordance.
- [ ] Page strip: support the prototype’s thumbnail density and dark canvas margins without stretched/cropped-looking thumbs.
- [ ] Viewer toolbar: match icon order, divider rhythm, metadata placement, and the compact zoom controls from the PDF.
- [ ] Viewer canvas: page should sit at the prototype’s scale with a large black workspace and strong page halo.
- [ ] Viewer canvas: crop overlays should use prototype label chips, translucent type color fills, and selection handles that do not look noisy.
- [ ] Viewer canvas: define a Photoshop-inspired crop interaction spec before adding more crop controls.
- [ ] Viewer footer: match prototype status copy and shortcut chip styling.
- [ ] Workbench header: add the view switcher, project/page chip, project decisions button, and compact icon states exactly like the PDF.
- [ ] Workbench stats strip: include All/Queue/Drafts/Final counts with orange active filter, plus the Send queue button.
- [ ] Scratchpad list: rows should include queue toggle/order cells, label pill, draft/final text, source preview, and status icons.
- [ ] Scratchpad editor: replace plain textareas with prototype field blocks for Source, Draft from model, Final, and Notes.
- [ ] Scratchpad editor: support quick actions shown in the prototype, including ask/regenerate/copy/promote/delete affordances.
- [x] Crop queue: show a dedicated Send Queue strip in chat with ordered pills and clear/remove controls.
- [ ] Chat header: match the prototype’s keyboard/more buttons and auto-saved pill.
- [x] Chat language strip: use prototype dropdown styling with source/target language controls and model selector.
- [x] Chat messages: render user messages as rounded accent bubbles with attachment chips and timestamps.
- [x] Image-only user chat messages should render attachment chips only, with no fake body text or ellipsis.
- [x] User chat messages should never show model/provider badges; model identity belongs to assistant responses.
- [x] Chat message model badges should use the friendly model name everywhere, with the slug reserved for tooltip/details.
- [x] Parse markdown/light structured assistant output into readable blocks before the fuller first-pass card UI lands.
- [x] Keep the message list pinned to the active pending/streaming response and clear stale pending bubbles after reload.
- [x] Make sent attachments vs ready-to-send attachments visually distinct.
- [x] Compress Project Guide chip to a short label in the chat panel.
- [ ] Compress language/model controls into a single efficient row.
- [ ] Assistant messages: render model identity, vision badge, token/cost metadata, first-pass chip block, and line analysis cards instead of raw preformatted text only.
- [x] Add per-page chat sessions/passes so the user can start a new model context without losing old chat history.
- [x] Add current-pass selection UI in the chat panel.
- [x] Add clear-current-pass behavior separate from clear-whole-project chat.
- [x] Replace chat pass rename browser prompt with an inline rename field/menu.
- [x] Add archive/delete chat pass controls with confirmation.
- [x] Add pass templates: Full page pass, crop queue pass, line refinement pass, terminology pass.
- [x] First-pass parser UI: expose "Send to scratchpad" / auto-populate behavior clearly, without making users touch Markdown tables.
- [x] Model picker: match prototype rows with provider avatars, vision/favorite/default badges, available count, pricing/context alignment, and full orange selected row.
- [ ] Settings modal: match prototype side-nav with icons and pages for System prompt, Languages, Workspace, Image quality, Account, and Shortcuts.
- [ ] Settings prompt page: include reset/default and preset affordances shown in the PDF.
- [ ] Export modal: match the PDF’s compact modal layout, scope cards, format buttons, include checkboxes, and export location display.
- [x] Project decisions modal: group decisions by category with section headers and row-level edit/add controls instead of one generic grid.
- [x] Rename visible Project Decisions language to Project Guide.
- [x] Typesetting placeholder: match the PDF’s centered icon, copy, and shipping-order list with status pills.
- [x] Empty/import states: match the prototype’s import/open workspace overlays and make supported formats obvious: images, folders, ZIP, CBZ, CBR message, PDF planned.
- [ ] Modal overlays: match prototype width, dimming, border, close placement, and inner spacing.
- [ ] Typography: tune weights/sizes to match Inter Tight / mono / JP hierarchy from the PDF.
- [ ] Color tokens: keep the orange accent as the only selection/action color and remove inconsistent blue native UI artifacts.

## 18. Sample Manga Test Pass
- [x] Locate the 5-6 sample manga pages the user provided in the workspace or downloads.
- [x] Import the sample pages through browser upload.
- [x] Import the sample pages through local path import.
- [x] Verify natural ordering of the sample pages in the page strip.
- [x] Switch between multiple projects and confirm the viewer image, thumbnails, workbench, and chat all update.
- [x] Create crops on several sample pages at different zoom levels.
- [x] Name crops with speech, SFX, and narration labels.
- [x] Queue one crop, multiple crops, and all crops.
- [x] Send a page-only chat request path up to the OpenRouter-key gate without typed text.
- [x] Send a crop-only chat request path up to the OpenRouter-key gate without typed text.
- [x] Send a queue-only chat request path up to the OpenRouter-key gate without typed text.
- [x] If an OpenRouter key is connected, carefully run one low-risk translation request against a sample page.
- [x] Confirm streamed response persists in chat.
- [x] Confirm first-pass translation rows can be sent to scratchpad.
- [x] Restart server and confirm sample project state persists.
- [x] Export current sample page to Markdown.
- [x] Export whole sample project to Markdown.
- [x] Use Computer Use / browser automation to verify the UI visually after each major interaction pass.

## 19. Near-Term Backend Gaps
- [x] Add runtime schema validation for API request bodies before writing to SQLite or the filesystem.
- [x] Implement crop deletion endpoint and UI.
- [x] Implement crop rename/type edit after creation.
- [x] Implement crop move/resize persistence endpoint so text crops can be corrected without recreating them.
- [x] Implement crop queue reorder endpoint and UI.
- [x] Implement page-scoped chat clearing endpoint.
- [x] Implement project-scoped chat clearing endpoint.
- [x] Add chat session/thread table for multiple independent conversations per page/project.
- [x] Store active chat session in project state and include only that session in model context.
- [ ] Add command history persistence for undoable crop create/move/resize/delete operations.
- [ ] Add command history persistence for scratchpad edits and chat/context clearing.
- [x] Store model responses in a structured internal translation schema: label, type, source, draft, notes, confidence, crop ids, and page id.
- [x] Link structured model response records to page, crop, chat pass, model, and scratchpad row identifiers.
- [x] Add page-level progress rollups derived from scratchpad totals: drafted count, final count, total detected/expected lines.
- [x] Add project-level progress rollups derived from page status.
- [ ] Add import progress for large ZIP/CBZ/folder jobs.
- [x] Add duplicate import detection or clear duplicate handling.
- [ ] Implement PDF rasterization into page images.
- [ ] Keep PDF import below image/folder/ZIP/CBZ stability work in priority.
- [ ] Implement CBR extraction if a portable extractor is available.
- [x] Add JSON export.
- [x] Add CSV export.
- [x] Add better OpenRouter streaming error normalization for model/provider failures.
- [x] Add account/key validation feedback immediately after manual key save.
- [x] Avoid writing secrets to project exports or chat transcripts.
- [x] Add a project cleanup/manage dialog for test projects and stale imports.

## 20. Near-Term Frontend Gaps
- [ ] Split the large `src/main.jsx` into stable components after behavior settles.
- [x] Move chat/translation parsing helpers into dedicated parser modules with focused tests.
- [x] Move frontend API helpers into an API/client module with shared response/error handling.
- [x] Evaluate TanStack Query for project/page/status/chat cache, mutations, optimistic updates, and invalidation.
- [x] Evaluate React Hook Form for settings, account, Project Guide, export, and onboarding forms after UI modules are split.
- [x] Add keyboard shortcuts: V select, C crop, H pan, Shift+Enter send, Q queue.
- [x] Add drag/drop import overlay on the viewer.
- [x] Add folder picker affordance that is clearer than hidden input buttons.
- [x] Replace remaining native `prompt` / `confirm` dialogs with in-app modal flows.
- [x] Add "attach current page" visible state so users know the context is queued for sending.
- [x] Add "attach selected crop" visible state and disabled state when no crop is selected.
- [x] Add clear-all attachments button.
- [x] Add crop inspector controls for rename, type, x/y/w/h, nudge, save, and delete.
- [x] Remove crop inspector movement buttons; movement belongs to canvas dragging and arrow keys.
- [x] Unselect the selected crop and close the crop inspector when clicking the same crop again.
- [x] Unselect the selected crop and close the crop inspector after saving crop inspector changes.
- [x] Add crop inspector controls for queue and duplicate.
- [x] Focus the crop label editor after creating a crop so naming is quick and local to the app.
- [x] Allow selected crop boxes to be moved directly on the viewer canvas.
- [x] Allow selected crop boxes to be resized with handles on the viewer canvas.
- [x] Make crop mode behave like region-edit mode: drag empty canvas to create, drag existing crop to move, drag handles to resize.
- [x] Add hover affordances for existing crop boxes in crop mode so users know they can move/resize them.
- [x] Add Escape-to-cancel active crop drawing or crop edit before mouse up.
- [ ] Add Shift/Option modifiers for constrained resize and center/outward resize.
- [ ] Add crop snap guides / soft alignment against nearby boxes and page text-box edges.
- [x] Add a crop history stack UI with Undo/Redo buttons, not only Command-Z.
- [x] Add redo support for crop create/move/resize/delete.
- [x] Debounce or batch crop move writes during canvas dragging so large projects stay responsive.
- [x] Add keyboard nudging for selected crop boxes with arrow keys.
- [x] Add crop deletion from viewer, crop dock, and card view.
- [x] Make card view show crop cards with queue/delete/edit actions instead of only scratchpad cards.
- [x] Add clear current chat/context control in chat header.
- [x] Add multiple chat/thread picker in chat header.
- [x] Represent chats as named translation passes/threads per page and project.
- [x] Add "Archive pass" controls with confirmation.
- [x] Add "new chat" control that starts a clean model context while preserving old transcripts.
- [x] Show active chat session/pass name and context scope in the chat header.
- [x] Display model name, timestamp, and attachment count on every chat message.
- [x] Display model/provider metadata on streamed assistant responses.
- [ ] Render structured first-pass model output as editable line cards linked to scratchpad rows.
- [x] Add page status display based on translation progress, e.g. Drafted 4/8 and Final 3/8.
- [x] Show side/page-strip thumbnail progress bars only on mouse hover or keyboard focus.
- [x] Add project overview status counts for untranslated, drafted, reviewed, final, and typeset pages.
- [x] Add autosave debounce indicators for scratchpad edits.
- [x] Add save-on-blur for scratchpad fields.
- [x] Add polished empty states for no project, empty project, no page, no crops, no scratchpad rows, no chat.
- [x] Replace empty chat sentence with focused starter actions.
- [x] Add responsive behavior that keeps the workbench/chat reachable below desktop widths.
- [ ] Add visual regression screenshots for the PDF-derived screens.

## 21. Dependency And Packaging Gaps
- [x] Pin direct dependency versions instead of using `latest` ranges.
- [x] Remove unused dependencies, including `@openrouter/sdk` if the raw HTTP path remains the supported implementation.
- [x] Resolve the transitive `uuid` advisory from `streamdown` / `mermaid` when dependency updates allow it.
- [x] Code-split or dynamically load heavy Markdown/diagram rendering paths if the production bundle keeps growing.

## Decision Log
- React/Vite chosen over browser Babel for production.
- `design-reference/` keeps the full mockup canvas.
- `legacy-v1/` remains read-only reference.
- Workspace root follows the mockup: `~/Documents/MangaTranslator`.
- OpenRouter key info uses `/api/v1/key`; total credits endpoint is not required.
- PDF/CBR appear in UI but are explicit follow-up importers unless dependencies are added.
