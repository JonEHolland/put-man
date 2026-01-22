import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Tab, Request, HttpRequest, GraphQLRequest, WebSocketRequest, SSERequest, Environment, Response } from '../../shared/types/models'
import { useToastStore } from './toastStore'
import { useEnvironmentStore } from './environmentStore'

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

function createNewGraphQLRequest(): GraphQLRequest {
  return {
    id: uuidv4(),
    name: 'GraphQL',
    type: 'graphql',
    url: '',
    query: '',
    variables: '',
    headers: [],
    auth: { type: 'none' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

function createNewWebSocketRequest(): WebSocketRequest {
  return {
    id: uuidv4(),
    name: 'WebSocket',
    type: 'websocket',
    url: '',
    headers: [],
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
    isDirty: false,
    isLoading: false
  }
}

function createNewGraphQLTab(): Tab {
  const request = createNewGraphQLRequest()
  return {
    id: uuidv4(),
    title: 'GraphQL',
    request,
    isDirty: false,
    isLoading: false
  }
}

function createNewWebSocketTab(): Tab {
  const request = createNewWebSocketRequest()
  return {
    id: uuidv4(),
    title: 'WebSocket',
    request,
    isDirty: false,
    isLoading: false,
    wsState: {
      status: 'disconnected',
      messages: []
    }
  }
}

function createNewSSERequest(): SSERequest {
  return {
    id: uuidv4(),
    name: 'SSE',
    type: 'sse',
    url: '',
    headers: [],
    auth: { type: 'none' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

function createNewSSETab(): Tab {
  const request = createNewSSERequest()
  return {
    id: uuidv4(),
    title: 'SSE',
    request,
    isDirty: false,
    isLoading: false,
    sseState: {
      status: 'disconnected',
      events: []
    }
  }
}

// Track abort controllers for request cancellation
const abortControllers = new Map<string, AbortController>()

interface AppState {
  tabs: Tab[]
  activeTab: string | null

  // Tab actions
  createNewTab: () => void
  createGraphQLTab: () => void
  createWebSocketTab: () => void
  createSSETab: () => void
  closeTab: (id: string) => void
  closeOtherTabs: (id: string) => void
  closeAllTabs: () => void
  closeTabsToRight: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, updates: Partial<Tab>) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  duplicateTab: (id: string) => void
  openRequestInNewTab: (request: Request) => void

  // Request actions
  sendRequest: (tabId: string, environment?: Environment | null) => Promise<void>
  cancelRequest: (tabId: string) => void
  sendGraphQLRequest: (tabId: string, environment?: Environment | null) => Promise<void>
  cancelGraphQLRequest: (tabId: string) => void
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

  createGraphQLTab: () => {
    const newTab = createNewGraphQLTab()
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTab: newTab.id
    }))
  },

  createWebSocketTab: () => {
    const newTab = createNewWebSocketTab()
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTab: newTab.id
    }))
  },

  createSSETab: () => {
    const newTab = createNewSSETab()
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTab: newTab.id
    }))
  },

  closeTab: (id: string) => {
    // Disconnect WebSocket or SSE if this is a websocket/sse tab
    const { tabs } = get()
    const tab = tabs.find((t) => t.id === id)
    if (tab?.request.type === 'websocket' && tab.wsState?.status === 'connected') {
      window.api.websocket.disconnect(id).catch(() => {
        // Ignore disconnect errors on close
      })
    }
    if (tab?.request.type === 'sse' && tab.sseState?.status === 'connected') {
      window.api.sse.disconnect(id).catch(() => {
        // Ignore disconnect errors on close
      })
    }

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

  closeOtherTabs: (id: string) => {
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id === id),
      activeTab: id
    }))
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTab: null })
  },

  closeTabsToRight: (id: string) => {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === id)
      if (index === -1) return state

      const newTabs = state.tabs.slice(0, index + 1)
      const newActiveTab = newTabs.some((t) => t.id === state.activeTab)
        ? state.activeTab
        : id

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

  reorderTabs: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newTabs = [...state.tabs]
      const [removed] = newTabs.splice(fromIndex, 1)
      newTabs.splice(toIndex, 0, removed)
      return { tabs: newTabs }
    })
  },

  duplicateTab: (id: string) => {
    const { tabs } = get()
    const tab = tabs.find((t) => t.id === id)
    if (!tab) return

    const newTab: Tab = {
      id: uuidv4(),
      title: `${tab.title} (copy)`,
      request: { ...tab.request, id: uuidv4() },
      isDirty: false,
      isLoading: false
    }

    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === id)
      const newTabs = [...state.tabs]
      newTabs.splice(index + 1, 0, newTab)
      return { tabs: newTabs, activeTab: newTab.id }
    })
  },

  openRequestInNewTab: (request: Request) => {
    const newTab: Tab = {
      id: uuidv4(),
      title: request.name || (request.type === 'http' ? (request as HttpRequest).url : 'Request'),
      request: { ...request, id: uuidv4() },
      isDirty: false,
      isLoading: false
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

    const httpRequest = tab.request as HttpRequest
    if (!httpRequest.url) {
      useToastStore.getState().warning('Please enter a URL')
      return
    }

    // Cancel any existing request for this tab
    const existingController = abortControllers.get(tabId)
    if (existingController) {
      existingController.abort()
    }

    // Create new abort controller
    const controller = new AbortController()
    abortControllers.set(tabId, controller)

    // Set loading state
    updateTab(tabId, { isLoading: true })

    try {
      const response: Response = await window.api.http.send(
        httpRequest,
        environment || undefined
      )

      // Check if request was cancelled
      if (controller.signal.aborted) {
        return
      }

      updateTab(tabId, { response, isLoading: false })

      // Apply environment updates from scripts (for request chaining)
      // Pre-request script updates are already applied during request execution,
      // but we need to persist test script updates for subsequent requests
      const scriptUpdates = {
        ...(response.preRequestScriptResult?.environmentUpdates || {}),
        ...(response.testScriptResult?.environmentUpdates || {})
      }
      if (Object.keys(scriptUpdates).length > 0) {
        await useEnvironmentStore.getState().applyScriptUpdates(scriptUpdates)
      }

      // Add to history
      await window.api.db.addToHistory(tab.request, response)

      // Show success/error toast based on status
      if (response.status >= 200 && response.status < 300) {
        useToastStore.getState().success(`${response.status} ${response.statusText}`)
      } else if (response.status >= 400) {
        useToastStore.getState().error(`${response.status} ${response.statusText}`)
      }
    } catch (error: any) {
      // Check if request was cancelled
      if (controller.signal.aborted) {
        updateTab(tabId, { isLoading: false })
        return
      }

      const errorMessage = error.message || 'Request failed'
      useToastStore.getState().error(errorMessage)

      const errorResponse: Response = {
        id: uuidv4(),
        requestId: tab.request.id,
        status: 0,
        statusText: errorMessage,
        headers: {},
        body: errorMessage,
        size: 0,
        time: 0,
        timestamp: new Date().toISOString()
      }
      updateTab(tabId, { response: errorResponse, isLoading: false })
    } finally {
      abortControllers.delete(tabId)
    }
  },

  cancelRequest: (tabId: string) => {
    const controller = abortControllers.get(tabId)
    if (controller) {
      controller.abort()
      abortControllers.delete(tabId)
      useToastStore.getState().info('Request cancelled')
      get().updateTab(tabId, { isLoading: false })
    }
  },

  sendGraphQLRequest: async (tabId: string, environment?: Environment | null) => {
    const { tabs, updateTab } = get()
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return

    const graphqlRequest = tab.request as GraphQLRequest
    if (!graphqlRequest.url) {
      useToastStore.getState().warning('Please enter a URL')
      return
    }

    if (!graphqlRequest.query.trim()) {
      useToastStore.getState().warning('Please enter a GraphQL query')
      return
    }

    // Cancel any existing request for this tab
    const existingController = abortControllers.get(tabId)
    if (existingController) {
      existingController.abort()
    }

    // Create new abort controller
    const controller = new AbortController()
    abortControllers.set(tabId, controller)

    // Set loading state
    updateTab(tabId, { isLoading: true })

    try {
      const response: Response = await window.api.graphql.send(
        graphqlRequest,
        environment || undefined
      )

      // Check if request was cancelled
      if (controller.signal.aborted) {
        return
      }

      updateTab(tabId, { response, isLoading: false })

      // Apply environment updates from scripts
      const scriptUpdates = {
        ...(response.preRequestScriptResult?.environmentUpdates || {}),
        ...(response.testScriptResult?.environmentUpdates || {})
      }
      if (Object.keys(scriptUpdates).length > 0) {
        await useEnvironmentStore.getState().applyScriptUpdates(scriptUpdates)
      }

      // Add to history
      await window.api.db.addToHistory(tab.request, response)

      // Show success/error toast based on status
      if (response.status >= 200 && response.status < 300) {
        useToastStore.getState().success(`${response.status} ${response.statusText}`)
      } else if (response.status >= 400) {
        useToastStore.getState().error(`${response.status} ${response.statusText}`)
      }
    } catch (error: unknown) {
      // Check if request was cancelled
      if (controller.signal.aborted) {
        updateTab(tabId, { isLoading: false })
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Request failed'
      useToastStore.getState().error(errorMessage)

      const errorResponse: Response = {
        id: uuidv4(),
        requestId: tab.request.id,
        status: 0,
        statusText: errorMessage,
        headers: {},
        body: errorMessage,
        size: 0,
        time: 0,
        timestamp: new Date().toISOString()
      }
      updateTab(tabId, { response: errorResponse, isLoading: false })
    } finally {
      abortControllers.delete(tabId)
    }
  },

  cancelGraphQLRequest: (tabId: string) => {
    const controller = abortControllers.get(tabId)
    if (controller) {
      controller.abort()
      abortControllers.delete(tabId)
      window.api.graphql.cancel(tabId).catch(() => {
        // Ignore cancel errors
      })
      useToastStore.getState().info('Request cancelled')
      get().updateTab(tabId, { isLoading: false })
    }
  }
}))
