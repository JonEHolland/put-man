import { create } from 'zustand'
import type { HistoryEntry } from '../../shared/types/models'

interface HistoryState {
  history: HistoryEntry[]
  isLoading: boolean

  // Actions
  loadHistory: (limit?: number) => Promise<void>
  clearHistory: () => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set) => ({
  history: [],
  isLoading: false,

  loadHistory: async (limit = 100) => {
    set({ isLoading: true })
    try {
      const history = await window.api.db.getHistory(limit)
      set({ history })
    } finally {
      set({ isLoading: false })
    }
  },

  clearHistory: async () => {
    await window.api.db.clearHistory()
    set({ history: [] })
  }
}))
