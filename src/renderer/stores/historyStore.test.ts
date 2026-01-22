import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistoryStore } from './historyStore'
import type { HistoryEntry, Request, Response } from '../../shared/types/models'

// Helper to create mock history entries
const mockRequest = (overrides: Partial<Request> = {}): Request => ({
  id: 'req-1',
  type: 'http',
  name: 'Test Request',
  url: 'https://api.example.com/test',
  method: 'GET',
  headers: [],
  params: [],
  body: { type: 'none' },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
})

const mockResponse = (overrides: Partial<Response> = {}): Response => ({
  status: 200,
  statusText: 'OK',
  headers: {},
  body: '{"success": true}',
  time: 150,
  size: 18,
  ...overrides
})

const mockHistoryEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: 'history-1',
  request: mockRequest(),
  response: mockResponse(),
  timestamp: '2024-01-01T00:00:00.000Z',
  ...overrides
})

describe('historyStore', () => {
  beforeEach(() => {
    // Reset store state
    useHistoryStore.setState({
      history: [],
      isLoading: false
    })
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('loadHistory', () => {
    it('should load history from API', async () => {
      const historyEntries = [
        mockHistoryEntry(),
        mockHistoryEntry({ id: 'history-2' })
      ]
      vi.mocked(window.api.db.getHistory).mockResolvedValueOnce(historyEntries)

      const { loadHistory } = useHistoryStore.getState()
      await loadHistory()

      const state = useHistoryStore.getState()
      expect(state.history).toEqual(historyEntries)
      expect(state.isLoading).toBe(false)
    })

    it('should use default limit of 100', async () => {
      vi.mocked(window.api.db.getHistory).mockResolvedValueOnce([])

      const { loadHistory } = useHistoryStore.getState()
      await loadHistory()

      expect(window.api.db.getHistory).toHaveBeenCalledWith(100)
    })

    it('should use custom limit when provided', async () => {
      vi.mocked(window.api.db.getHistory).mockResolvedValueOnce([])

      const { loadHistory } = useHistoryStore.getState()
      await loadHistory(50)

      expect(window.api.db.getHistory).toHaveBeenCalledWith(50)
    })

    it('should set isLoading while loading', async () => {
      vi.mocked(window.api.db.getHistory).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      const { loadHistory } = useHistoryStore.getState()
      const loadPromise = loadHistory()

      expect(useHistoryStore.getState().isLoading).toBe(true)

      await loadPromise
      expect(useHistoryStore.getState().isLoading).toBe(false)
    })

    it('should handle history entries without response', async () => {
      const historyEntries = [
        mockHistoryEntry({ response: undefined })
      ]
      vi.mocked(window.api.db.getHistory).mockResolvedValueOnce(historyEntries)

      const { loadHistory } = useHistoryStore.getState()
      await loadHistory()

      expect(useHistoryStore.getState().history[0].response).toBeUndefined()
    })
  })

  describe('clearHistory', () => {
    it('should clear all history', async () => {
      useHistoryStore.setState({
        history: [mockHistoryEntry(), mockHistoryEntry({ id: 'history-2' })]
      })

      const { clearHistory } = useHistoryStore.getState()
      await clearHistory()

      expect(window.api.db.clearHistory).toHaveBeenCalled()
      expect(useHistoryStore.getState().history).toEqual([])
    })

    it('should work when history is already empty', async () => {
      const { clearHistory } = useHistoryStore.getState()
      await clearHistory()

      expect(window.api.db.clearHistory).toHaveBeenCalled()
      expect(useHistoryStore.getState().history).toEqual([])
    })
  })
})
