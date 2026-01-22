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
6. ALWAYS COMMIT AND PUSH BEFORE STARTING A NEW FEATURE.
7. ALWAYS MAKE SURE ALL TESTS AND E2E TESTS PASS.
8. If you make UX changes, use playwright to take a new promotional screenshot and add it to readme.md so people can see the UI on github.

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
- **GraphQL support** with query/variables editor and introspection
- **gRPC support** with proto file loading and service/method selection
- **Native macOS menu bar** with keyboard shortcuts
- 122 unit tests passing across 8 test files
- macOS code signing configured
- E2E Testing Framework with Playwright for Electron

## What Was Just Completed

**gRPC Support**: Added full gRPC client functionality:

- Created `src/main/services/grpc.ts` using `@grpc/grpc-js` and `protobufjs`
- Proto file loading with service/method discovery
- Service and method selection dropdowns in UI
- Unary gRPC request execution with JSON message input
- gRPC metadata (similar to HTTP headers) editor
- Full auth support (basic, bearer, API key)
- Pre/post request scripts with environment variable updates
- Server reflection support (falls back to proto file if unavailable)
- Created `src/renderer/components/grpc/GrpcPanel.tsx` and `MetadataEditor.tsx`
- Added `createGrpcTab` and `sendGrpcRequest` to appStore
- Integrated into AppLayout with keyboard shortcut (Cmd+Enter) support
- Added "New gRPC" button to empty state

## What to Work on Next

Potential next steps:

1. **App Icon**: Create and configure a proper macOS app icon (.icns file in build/ directory)
2. **Fix Remaining E2E Tests**: Refine selectors for failing tests (environment manager, history, code generation). Add data-testid attributes to components if needed.
3. **GraphQL Enhancements**: Schema explorer sidebar, autocomplete in query editor, query history
4. **gRPC Streaming**: Add support for server streaming, client streaming, and bidirectional streaming RPC methods
5. **Performance Optimization**: Virtualized lists for large collections/history, response streaming, code splitting
6. **Production Readiness**: Auto-updates (electron-updater), error reporting, user documentation
7. **WebSocket/SSE Enhancements**: Binary messages, filtering/search, save to collections
8. **Fix TypeScript Errors**: Several pre-existing TypeScript strict mode errors need addressing

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

2. **Native Modules**: `@electron/rebuild` in postinstall, `asarUnpack` for .node files, `bufferutil` as regular dependency for ws performance

3. **Preload**: Outputs as `.mjs` (ESM) - main process references `../preload/index.mjs`

4. **Testing**: Vitest with jsdom for unit tests, Playwright for E2E Electron tests

5. **E2E Testing**: Custom Playwright fixture launches Electron app, tests run against built app (`out/main/index.js`)

6. **GraphQL**: Uses axios POST to GraphQL endpoint, supports standard introspection query

## Critical Files

| Area | Files |
|------|-------|
| Main Process | `src/main/index.ts`, `src/main/ipc/index.ts`, `src/main/menu.ts` |
| Database | `src/main/database/init.ts`, `src/main/database/repositories.ts` |
| Services | `src/main/services/http.ts`, `src/main/services/graphql.ts`, `src/main/services/grpc.ts`, `src/main/services/scriptRunner.ts`, `src/main/services/oauth2.ts`, `src/main/services/websocket.ts`, `src/main/services/sse.ts`, `src/main/services/codeGeneration.ts`, `src/main/services/importExport.ts` |
| Preload | `src/preload/index.ts` |
| Types | `src/shared/types/models.ts` |
| UI | `src/renderer/components/layout/AppLayout.tsx`, `src/renderer/components/request/*.tsx`, `src/renderer/components/graphql/GraphQLPanel.tsx`, `src/renderer/components/grpc/GrpcPanel.tsx`, `src/renderer/components/response/ResponsePanel.tsx` |
| Stores | `src/renderer/stores/appStore.ts`, `src/renderer/stores/environmentStore.ts`, `src/renderer/stores/collectionStore.ts` |
| Build | `electron-vite.config.ts`, `build/notarize.js`, `build/entitlements.mac.plist` |
| E2E Tests | `e2e/electron-fixture.ts`, `e2e/app.spec.ts`, `e2e/advanced-features.spec.ts`, `playwright.config.ts` |

## Architecture

- **IPC**: Renderer → `window.api.xxx()` → preload → main process handlers in `src/main/ipc/index.ts`
- **State**: Zustand stores in renderer, synced with main process via IPC
- **HTTP/GraphQL**: Executed in main process (axios) to avoid CORS
- **Scripts**: Run in Node's VM sandbox, 5s timeout, environment updates persisted via `applyScriptUpdates()`
- **WebSocket/SSE**: Managed in main process, events pushed to renderer via IPC
- **E2E Tests**: Playwright launches Electron, waits for window, uses helper functions like `ensureTabOpen()` since app starts with no tabs
