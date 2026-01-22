import { create } from 'zustand'
import type { Collection, Folder, CollectionRequest, Request } from '../../shared/types/models'

interface CollectionState {
  collections: Collection[]
  folders: Record<string, Folder[]>
  requests: Record<string, CollectionRequest[]>
  isLoading: boolean
  expandedCollections: Set<string>

  // Collection actions
  loadCollections: () => Promise<void>
  createCollection: (name: string, description?: string) => Promise<Collection>
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>
  deleteCollection: (id: string) => Promise<void>
  toggleCollectionExpanded: (id: string) => void

  // Folder actions
  loadFolders: (collectionId: string) => Promise<void>
  createFolder: (collectionId: string, name: string, parentId?: string) => Promise<Folder>
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>
  deleteFolder: (id: string) => Promise<void>

  // Request actions
  loadRequests: (collectionId: string) => Promise<void>
  saveRequest: (collectionId: string, request: Request, folderId?: string) => Promise<CollectionRequest>
  updateRequest: (id: string, request: Request) => Promise<CollectionRequest>
  deleteRequest: (id: string, collectionId: string) => Promise<void>
  duplicateRequest: (collectionRequestId: string, collectionId: string) => Promise<CollectionRequest>
  moveRequest: (requestId: string, collectionId: string, targetFolderId?: string) => Promise<void>
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  folders: {},
  requests: {},
  isLoading: false,
  expandedCollections: new Set<string>(),

  loadCollections: async () => {
    set({ isLoading: true })
    try {
      const collections = await window.api.db.getCollections()
      set({ collections })
    } finally {
      set({ isLoading: false })
    }
  },

  createCollection: async (name: string, description?: string) => {
    const collection = await window.api.db.createCollection(name, description)
    set((state) => ({
      collections: [...state.collections, collection]
    }))
    return collection
  },

  updateCollection: async (id: string, updates: Partial<Collection>) => {
    await window.api.db.updateCollection(id, updates)
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    }))
  },

  deleteCollection: async (id: string) => {
    await window.api.db.deleteCollection(id)
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id)
    }))
  },

  toggleCollectionExpanded: (id: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedCollections)
      if (newExpanded.has(id)) {
        newExpanded.delete(id)
      } else {
        newExpanded.add(id)
        // Trigger loading folders and requests when expanding
        get().loadFolders(id)
        get().loadRequests(id)
      }
      return { expandedCollections: newExpanded }
    })
  },

  loadFolders: async (collectionId: string) => {
    const folders = await window.api.db.getFolders(collectionId)
    set((state) => ({
      folders: { ...state.folders, [collectionId]: folders }
    }))
  },

  createFolder: async (collectionId: string, name: string, parentId?: string) => {
    const folder = await window.api.db.createFolder(collectionId, name, parentId)
    set((state) => ({
      folders: {
        ...state.folders,
        [collectionId]: [...(state.folders[collectionId] || []), folder]
      }
    }))
    return folder
  },

  updateFolder: async (id: string, updates: Partial<Folder>) => {
    await window.api.db.updateFolder(id, updates)
    set((state) => {
      const newFolders: Record<string, Folder[]> = {}
      for (const [collectionId, folderList] of Object.entries(state.folders)) {
        newFolders[collectionId] = folderList.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        )
      }
      return { folders: newFolders }
    })
  },

  deleteFolder: async (id: string) => {
    await window.api.db.deleteFolder(id)
    // Reload folders for affected collection
    // For now, just remove from all collections
    set((state) => {
      const newFolders: Record<string, Folder[]> = {}
      for (const [collectionId, folderList] of Object.entries(state.folders)) {
        newFolders[collectionId] = folderList.filter((f) => f.id !== id)
      }
      return { folders: newFolders }
    })
  },

  loadRequests: async (collectionId: string) => {
    const requests = await window.api.db.getCollectionRequests(collectionId)
    set((state) => ({
      requests: { ...state.requests, [collectionId]: requests }
    }))
  },

  saveRequest: async (collectionId: string, request: Request, folderId?: string) => {
    const collectionRequest = await window.api.db.saveRequest(collectionId, request, folderId)
    set((state) => ({
      requests: {
        ...state.requests,
        [collectionId]: [...(state.requests[collectionId] || []), collectionRequest]
      }
    }))
    return collectionRequest
  },

  updateRequest: async (id: string, request: Request) => {
    const updated = await window.api.db.updateRequest(id, request)
    set((state) => {
      const newRequests: Record<string, CollectionRequest[]> = {}
      for (const [collectionId, requestList] of Object.entries(state.requests)) {
        newRequests[collectionId] = requestList.map((r) =>
          r.id === id ? { ...r, request } : r
        )
      }
      return { requests: newRequests }
    })
    return updated
  },

  deleteRequest: async (id: string, collectionId: string) => {
    await window.api.db.deleteRequest(id)
    set((state) => ({
      requests: {
        ...state.requests,
        [collectionId]: (state.requests[collectionId] || []).filter((r) => r.id !== id)
      }
    }))
  },

  duplicateRequest: async (collectionRequestId: string, collectionId: string) => {
    const { requests } = get()
    const collectionRequests = requests[collectionId] || []
    const original = collectionRequests.find((r) => r.id === collectionRequestId)
    if (!original) throw new Error('Request not found')

    const duplicatedRequest = {
      ...original.request,
      id: crypto.randomUUID(),
      name: `${original.request.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const collectionRequest = await window.api.db.saveRequest(
      collectionId,
      duplicatedRequest,
      original.folderId
    )
    set((state) => ({
      requests: {
        ...state.requests,
        [collectionId]: [...(state.requests[collectionId] || []), collectionRequest]
      }
    }))
    return collectionRequest
  },

  moveRequest: async (requestId: string, collectionId: string, targetFolderId?: string) => {
    const movedRequest = await window.api.db.moveRequest(requestId, targetFolderId || null)
    set((state) => ({
      requests: {
        ...state.requests,
        [collectionId]: (state.requests[collectionId] || []).map((r) =>
          r.id === requestId ? { ...r, folderId: movedRequest.folderId } : r
        )
      }
    }))
  }
}))
