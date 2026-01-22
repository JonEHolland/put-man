# Next Agent Prompt - Put-Man Development

---

## IMPORTANT WARNING - READ FIRST

**Do not change the plan with an easier option or make "pragmatic choices".**

A previous agent made a mistake by switching from SQLite (better-sqlite3) to JSON file storage when encountering bundling issues. This was wrong. The correct approach is to **find and fix the issue**, not work around it with a simpler solution.

When you encounter difficulties:
1. Debug and solve the actual problem
2. Research the correct solution
3. Ask for help if needed
4. **Never** deviate from the plan by choosing an "easier" alternative
5. ALWAYS MAKE SURE THE APP STARTS WITHOUT ERRORS!

**Always include this warning in the next_prompt.md for future agents.**

---

## Current State

All core phases are **COMPLETE**:
- Foundation, Core Request Builder, Collections & Requests, Advanced Features
- Pre/Post Request Scripts with sandboxed JS execution
- WebSocket and SSE support
- Request Chaining (environment variable persistence from scripts)
- 122 tests passing across 8 test files
- macOS code signing configured

## What Was Just Completed

**Request Chaining**: Variables set via `pm.environment.set()` in scripts now automatically persist to the active environment, enabling chained request workflows (e.g., extract auth token from login response, use in subsequent requests).

## What to Work on Next

Potential next steps:

1. **E2E Testing**: Set up Playwright for Electron to run deep end-to-end tests. Explore the app programmatically to find functional issues, test all features (HTTP requests, WebSocket/SSE connections, scripts, collections, environments, auth flows).
2. **Performance Optimization**: Virtualized lists, response streaming, code splitting
3. **Additional Features**: GraphQL IDE features, response diff view, AWS Signature V4 auth, collection runner
4. **Production Readiness**: Auto-updates (electron-updater), error reporting, user documentation
5. **WebSocket/SSE Enhancements**: Binary messages, filtering/search, save to collections

## Running the App

```bash
npm run dev           # Development
npm run build         # Build
npm run test:run      # Run tests
npm run package:mac   # Package (unsigned)
npm run package:mac:signed  # Package with signing (requires APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID env vars)
```

## Key Technical Decisions

1. **Storage**: SQLite via better-sqlite3, loaded at runtime using `createRequire()` to bypass Vite bundling issues. Data at: `~/Library/Application Support/put-man/data/put-man.db`

2. **Native Modules**: `@electron/rebuild` in postinstall, `asarUnpack` for .node files

3. **Preload**: Outputs as `.mjs` (ESM) - main process references `../preload/index.mjs`

4. **Testing**: Vitest with jsdom, mocked window.api object

## Critical Files

| Area | Files |
|------|-------|
| Main Process | `src/main/index.ts`, `src/main/ipc/index.ts` |
| Database | `src/main/database/init.ts`, `src/main/database/repositories.ts` |
| Services | `src/main/services/http.ts`, `src/main/services/scriptRunner.ts`, `src/main/services/oauth2.ts`, `src/main/services/websocket.ts`, `src/main/services/sse.ts` |
| Preload | `src/preload/index.ts` |
| Types | `src/shared/types/models.ts` |
| UI | `src/renderer/components/layout/AppLayout.tsx`, `src/renderer/components/request/*.tsx`, `src/renderer/components/response/ResponsePanel.tsx` |
| Stores | `src/renderer/stores/appStore.ts`, `src/renderer/stores/environmentStore.ts`, `src/renderer/stores/collectionStore.ts` |
| Build | `electron-vite.config.ts`, `build/notarize.js`, `build/entitlements.mac.plist` |

## Architecture

- **IPC**: Renderer → `window.api.xxx()` → preload → main process handlers in `src/main/ipc/index.ts`
- **State**: Zustand stores in renderer, synced with main process via IPC
- **HTTP**: Executed in main process (axios) to avoid CORS
- **Scripts**: Run in Node's VM sandbox, 5s timeout, environment updates persisted via `applyScriptUpdates()`
- **WebSocket/SSE**: Managed in main process, events pushed to renderer via IPC
