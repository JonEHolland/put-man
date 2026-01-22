import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Clean up after each test to avoid React concurrent mode issues
afterEach(() => {
  cleanup()
})

// Mock window.api for renderer tests
const mockApi = {
  db: {
    getCollections: vi.fn().mockResolvedValue([]),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
    getFolders: vi.fn().mockResolvedValue([]),
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
    getRequests: vi.fn().mockResolvedValue([]),
    getCollectionRequests: vi.fn().mockResolvedValue([]),
    saveRequest: vi.fn(),
    updateRequest: vi.fn(),
    deleteRequest: vi.fn(),
    moveRequest: vi.fn(),
    getEnvironments: vi.fn().mockResolvedValue([]),
    createEnvironment: vi.fn(),
    updateEnvironment: vi.fn(),
    deleteEnvironment: vi.fn(),
    setActiveEnvironment: vi.fn(),
    getHistory: vi.fn().mockResolvedValue([]),
    addToHistory: vi.fn(),
    clearHistory: vi.fn()
  },
  http: {
    send: vi.fn()
  },
  import: {
    postmanCollection: vi.fn()
  },
  export: {
    toPostman: vi.fn()
  },
  codeGen: {
    generate: vi.fn()
  }
}

// Add api to the existing window object (don't overwrite the whole thing)
// @ts-ignore - mock window.api
if (typeof window !== 'undefined') {
  (window as any).api = mockApi
}
