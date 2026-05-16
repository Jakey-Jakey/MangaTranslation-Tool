# Frontend Library Evaluation

Date: 2026-05-16

## TanStack Query

Decision: adopt after the workflow component split, starting with read-only project/page/status queries and then mutations.

Why it fits:
- The app has server-owned state with repeated manual refresh paths: project status, page details, crops, queue, scratchpad, chat sessions, and exports.
- The official TanStack Query v5 docs describe its core value as fetching, caching, synchronizing, and updating server state for web apps, including query invalidation, mutation responses, optimistic updates, and testing.
- MangaTranslator already has the right API boundary now that `src/api/client.js` exists.

Recommended migration order:
- Add `QueryClientProvider` around `App`.
- Convert `/api/status`, `/api/page`, and `/api/models` first.
- Move crop, queue, scratchpad, and chat-session writes to mutations that invalidate page/status query keys.
- Delay chat streaming; the stream is local UI state until completion, then it can invalidate the active page/session query.

Risk:
- Adding it before viewer/workbench/chat modules are split will make the current `App` component harder to reason about.

Source: https://tanstack.com/query/latest/docs/framework/react/overview

## React Hook Form

Decision: defer until settings, account, Project Guide, export, and onboarding modals have been split into their own form modules.

Why it fits later:
- React Hook Form is designed for form state management and validation, and the current modal forms have repeated controlled input/save patterns.
- It would help most with validation and dirty state in Settings, Account, Project Guide rows, Export options, and Onboarding.

Why not now:
- The current forms are small and deeply embedded in `src/main.jsx`.
- Introducing it before modal extraction would mix library migration with component-boundary work.

Recommended migration order:
- Extract modal modules first.
- Add React Hook Form only to Settings and Export first.
- Keep scratchpad and crop inspector as explicit controlled forms because they autosave and interact with canvas/session state.

Sources:
- https://github.com/react-hook-form/react-hook-form
- https://github.com/react-hook-form/documentation
