# Next Agent Prompt - Put-Man Development

---

## ⚠️ IMPORTANT WARNING - READ FIRST ⚠️

**Do not change the plan with an easier option or make "pragmatic choices".**

A previous agent made a mistake by switching from SQLite (better-sqlite3) to JSON file storage when encountering bundling issues. This was wrong. The correct approach is to **find and fix the issue**, not work around it with a simpler solution.

When you encounter difficulties:
1. Debug and solve the actual problem
2. Research the correct solution
3. Ask for help if needed
4. **Never** deviate from the plan by choosing an "easier" alternative

**Always include this warning in the next_prompt.md for future agents. Let's never make this mistake again.**

---

## Current State

Phase 1: Foundation is **COMPLETE**. The app builds and runs successfully.

## What Was Just Completed

### Phase 1: Foundation
- **Project setup**: electron-vite with React 18, TypeScript, and TailwindCSS
- **Electron shell**: Main/preload/renderer architecture with proper context isolation
- **Data persistence**: JSON file-based storage (Note: switched from SQLite due to sql.js bundling issues with ESM/Electron)
- **Basic UI**: 3-panel layout with sidebar, request panel, and response panel
- **Zustand stores**: App state, collections, environments, and history management

### Key Files Created
- `src/main/index.ts` - Electron main process
- `src/preload/index.ts` - IPC bridge (context bridge)
- `src/main/database/init.ts` - JSON file storage
- `src/main/database/repositories.ts` - Data access layer
- `src/main/services/http.ts` - HTTP request execution with axios
- `src/main/ipc/index.ts` - IPC handlers
- `src/shared/types/models.ts` - Core TypeScript interfaces
- `src/renderer/components/layout/` - AppLayout, Sidebar, TabBar
- `src/renderer/components/request/` - RequestPanel, UrlBar, ParamsEditor, HeadersEditor, BodyEditor, AuthPanel
- `src/renderer/components/response/` - ResponsePanel with body/headers/cookies tabs
- `src/renderer/stores/` - Zustand stores for app, collections, environments, history

## What Phase to Work on Next

**Phase 2: Core Request Builder** - Enhance the request builder UI

Focus areas:
1. Monaco Editor integration for code/body editing (JSON syntax highlighting)
2. Improve body editors (proper JSON validation, form-data file uploads)
3. Response JSON viewer with syntax highlighting and collapsible nodes
4. Better URL variable highlighting (show `{{variable}}` in distinct color)

## Important Context & Decisions

1. **Storage**: ⚠️ **MISTAKE TO FIX** - Currently using JSON file storage instead of SQLite (better-sqlite3). This was a wrong decision made by a previous agent who took the "easy way out" instead of fixing the bundling issues. The plan specifies SQLite with better-sqlite3. A future phase should fix this by properly configuring electron-rebuild or resolving the native module bundling issues.

2. **Preload output**: The preload script outputs as `.mjs` (ESM) - the main process references it as `../preload/index.mjs`

3. **Running the app**:
   - Development: `npm run dev`
   - Build: `npm run build`
   - Package: `npm run package:mac`

4. **Data location**: `~/Library/Application Support/put-man/data/put-man.json`

## Critical Files to Review

1. `src/main/index.ts` - Electron main process entry
2. `src/preload/index.ts` - IPC bridge (security boundary)
3. `src/main/database/init.ts` - JSON storage init
4. `src/shared/types/models.ts` - Core TypeScript interfaces
5. `src/renderer/components/layout/AppLayout.tsx` - Main UI shell
6. `src/renderer/stores/appStore.ts` - Main app state with sendRequest

## Architecture Notes

- **IPC pattern**: Renderer calls `window.api.xxx()` → preload invokes IPC → main process handlers in `src/main/ipc/index.ts`
- **State management**: Zustand stores in renderer, synced with main process via IPC
- **HTTP execution**: Done in main process using axios to avoid CORS issues

## Next Steps for Phase 2

1. Install Monaco Editor: Already in dependencies, need to add `@monaco-editor/react` component
2. Create CodeEditor component wrapping Monaco
3. Replace textarea in BodyEditor with Monaco
4. Add JSON validation in body editor
5. Enhance ResponsePanel with Monaco for body display
6. Add variable highlighting utility

Read the full plan at the top of the conversation or in the plan file for complete implementation phases.
