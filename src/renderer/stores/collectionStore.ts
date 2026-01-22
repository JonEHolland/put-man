import { create } from 'zustand'
import type { Collection, Folder, CollectionRequest } from '../../shared/types/models'

interface CollectionState {
  collections: Collection[]
  folders: Record<string, Folder[]>
  requests: Record<string, CollectionRequest[]>
  isLoading: boolean

  // Collection actions
  loadCollections: () => Promise<void>
  createCollection: (name: string, description?: string) => Promise<Collection>
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>
  deleteCollection: (id: string) => Promise<void>

  // Folder actions
  loadFolders: (collectionId: string) => Promise<void>
  createFolder: (collectionId: string, name: string, parentId?: string) => Promise<Folder>
  deleteFolder: (id: string) => Promise<void>

  // Request actions
  loadRequests: (collectionId: string) => Promise<void>
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  folders: {},
  requests: {},
  isLoading: false,

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
  }
}))
