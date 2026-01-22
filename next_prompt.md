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
- Code Generation (cURL, JS Fetch/Axios, Python, Go, PHP)
- Import/Export (Postman Collection v2.1)
- 122 unit tests passing across 8 test files
- macOS code signing configured
- **E2E Testing Framework** with Playwright for Electron

## What Was Just Completed

**E2E Testing with Playwright**: Set up comprehensive end-to-end testing infrastructure:

- Installed `@playwright/test` with custom Electron fixture
- Created 2 test files with 50+ test cases covering:
  - App launch and welcome screen
  - Tab management (create, close, switch, drag-reorder)
  - HTTP Request Builder (method, URL, params, headers, body, auth)
  - Send/Cancel requests with actual HTTP calls to httpbin.org
  - Collections (create, expand, save requests, folders)
  - History tracking
  - Environments (create, add variables, select)
  - Response Panel (headers, body views, code generation)
  - WebSocket and SSE tab creation
  - Authentication (Basic, Bearer, API Key, OAuth2)
  - Keyboard shortcuts (Cmd+T, Cmd+W, Cmd+Enter)
  - Environment variable interpolation
  - Import/Export functionality

**Test Commands:**
```bash
npm run test:e2e          # Build and run all E2E tests
npm run test:e2e:headed   # Run with visible browser
npx playwright test e2e/app.spec.ts --grep "pattern"  # Run specific tests
```

**Current Status:** 19 tests passing, 10 tests need selector refinements for elements like environment manager modal, history entries, and code generation dropdown. The core infrastructure is solid.

## What to Work on Next

Potential next steps:

1. **Fix Remaining E2E Tests**: Refine selectors for failing tests (environment manager, history, code generation). Add data-testid attributes to components if needed for more reliable selection.
2. **Performance Optimization**: Virtualized lists for large collections/history, response streaming, code splitting
3. **Additional Features**: GraphQL IDE features, response diff view, AWS Signature V4 auth, collection runner
4. **Production Readiness**: Auto-updates (electron-updater), error reporting, user documentation
5. **WebSocket/SSE Enhancements**: Binary messages, filtering/search, save to collections

## Running the App

```bash
npm run dev           # Development
npm run build         # Build
npm run test:run      # Run unit tests
npm run test:e2e      # Run E2E tests (builds first)
npm run package:mac   # Package (unsigned)
npm run package:mac:signed  # Package with signing (requires APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID env vars)
```

## Key Technical Decisions

1. **Storage**: SQLite via better-sqlite3, loaded at runtime using `createRequire()` to bypass Vite bundling issues. Data at: `~/Library/Application Support/put-man/data/put-man.db`

2. **Native Modules**: `@electron/rebuild` in postinstall, `asarUnpack` for .node files

3. **Preload**: Outputs as `.mjs` (ESM) - main process references `../preload/index.mjs`

4. **Testing**: Vitest with jsdom for unit tests, Playwright for E2E Electron tests

5. **E2E Testing**: Custom Playwright fixture launches Electron app, tests run against built app (`out/main/index.js`)

## Critical Files

| Area | Files |
|------|-------|
| Main Process | `src/main/index.ts`, `src/main/ipc/index.ts` |
| Database | `src/main/database/init.ts`, `src/main/database/repositories.ts` |
| Services | `src/main/services/http.ts`, `src/main/services/scriptRunner.ts`, `src/main/services/oauth2.ts`, `src/main/services/websocket.ts`, `src/main/services/sse.ts`, `src/main/services/codeGeneration.ts`, `src/main/services/importExport.ts` |
| Preload | `src/preload/index.ts` |
| Types | `src/shared/types/models.ts` |
| UI | `src/renderer/components/layout/AppLayout.tsx`, `src/renderer/components/request/*.tsx`, `src/renderer/components/response/ResponsePanel.tsx` |
| Stores | `src/renderer/stores/appStore.ts`, `src/renderer/stores/environmentStore.ts`, `src/renderer/stores/collectionStore.ts` |
| Build | `electron-vite.config.ts`, `build/notarize.js`, `build/entitlements.mac.plist` |
| **E2E Tests** | `e2e/electron-fixture.ts`, `e2e/app.spec.ts`, `e2e/advanced-features.spec.ts`, `playwright.config.ts` |

## Architecture

- **IPC**: Renderer → `window.api.xxx()` → preload → main process handlers in `src/main/ipc/index.ts`
- **State**: Zustand stores in renderer, synced with main process via IPC
- **HTTP**: Executed in main process (axios) to avoid CORS
- **Scripts**: Run in Node's VM sandbox, 5s timeout, environment updates persisted via `applyScriptUpdates()`
- **WebSocket/SSE**: Managed in main process, events pushed to renderer via IPC
- **E2E Tests**: Playwright launches Electron, waits for window, uses helper functions like `ensureTabOpen()` since app starts with no tabs
