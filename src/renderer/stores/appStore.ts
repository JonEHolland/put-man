import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Tab, Request, HttpRequest, Environment, Response } from '../../shared/types/models'

function createNewHttpRequest(): HttpRequest {
  return {
    id: uuidv4(),
    name: 'Untitled',
    type: 'http',
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: { type: 'none', content: '' },
    auth: { type: 'none' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

function createNewTab(): Tab {
  const request = createNewHttpRequest()
  return {
    id: uuidv4(),
    title: 'Untitled',
    request,
    isDirty: false
  }
}

interface AppState {
  tabs: Tab[]
  activeTab: string | null

  // Tab actions
  createNewTab: () => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, updates: Partial<Tab>) => void
  openRequestInNewTab: (request: Request) => void

  // Request actions
  sendRequest: (tabId: string, environment?: Environment | null) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  tabs: [],
  activeTab: null,

  createNewTab: () => {
    const newTab = createNewTab()
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTab: newTab.id
    }))
  },

  closeTab: (id: string) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id)
      let newActiveTab = state.activeTab

      if (state.activeTab === id) {
        const closedIndex = state.tabs.findIndex((t) => t.id === id)
        if (newTabs.length > 0) {
          newActiveTab = newTabs[Math.min(closedIndex, newTabs.length - 1)].id
        } else {
          newActiveTab = null
        }
      }

      return { tabs: newTabs, activeTab: newActiveTab }
    })
  },

  setActiveTab: (id: string) => {
    set({ activeTab: id })
  },

  updateTab: (id: string, updates: Partial<Tab>) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, ...updates } : tab
      )
    }))
  },

  openRequestInNewTab: (request: Request) => {
    const newTab: Tab = {
      id: uuidv4(),
      title: request.name || (request.type === 'http' ? (request as HttpRequest).url : 'Request'),
      request: { ...request, id: uuidv4() },
      isDirty: false
    }
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTab: newTab.id
    }))
  },

  sendRequest: async (tabId: string, environment?: Environment | null) => {
    const { tabs, updateTab } = get()
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return

    try {
      const response: Response = await window.api.http.send(
        tab.request as HttpRequest,
        environment || undefined
      )

      updateTab(tabId, { response })

      // Add to history
      await window.api.db.addToHistory(tab.request, response)
    } catch (error: any) {
      const errorResponse: Response = {
        id: uuidv4(),
        requestId: tab.request.id,
        status: 0,
        statusText: error.message || 'Request failed',
        headers: {},
        body: error.message || 'Request failed',
        size: 0,
        time: 0,
        timestamp: new Date().toISOString()
      }
      updateTab(tabId, { response: errorResponse })
    }
  }
}))
