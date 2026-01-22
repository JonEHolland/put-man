import { v4 as uuidv4 } from 'uuid'
import { getData, saveDatabase } from './init'
import type {
  Collection,
  Folder,
  CollectionRequest,
  Request,
  Environment,
  EnvironmentVariable,
  HistoryEntry,
  Response
} from '../../shared/types/models'

// Collections repository
export const collectionsRepo = {
  getAll(): Collection[] {
    return getData().collections.sort((a, b) => a.name.localeCompare(b.name))
  },

  create(name: string, description?: string): Collection {
    const data = getData()
    const now = new Date().toISOString()
    const collection: Collection = {
      id: uuidv4(),
      name,
      description,
      createdAt: now,
      updatedAt: now
    }
    data.collections.push(collection)
    saveDatabase()
    return collection
  },

  update(id: string, updates: Partial<Collection>): Collection {
    const data = getData()
    const index = data.collections.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Collection not found')

    const collection = {
      ...data.collections[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    data.collections[index] = collection
    saveDatabase()
    return collection
  },

  delete(id: string): void {
    const data = getData()
    data.collections = data.collections.filter((c) => c.id !== id)
    // Also delete related folders and requests
    data.folders = data.folders.filter((f) => f.collectionId !== id)
    data.requests = data.requests.filter((r) => r.collectionId !== id)
    saveDatabase()
  }
}

// Folders repository
export const foldersRepo = {
  getByCollection(collectionId: string): Folder[] {
    return getData()
      .folders.filter((f) => f.collectionId === collectionId)
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  create(collectionId: string, name: string, parentId?: string): Folder {
    const data = getData()
    const now = new Date().toISOString()
    const folder: Folder = {
      id: uuidv4(),
      collectionId,
      parentId,
      name,
      createdAt: now,
      updatedAt: now
    }
    data.folders.push(folder)
    saveDatabase()
    return folder
  },

  update(id: string, updates: Partial<Folder>): Folder {
    const data = getData()
    const index = data.folders.findIndex((f) => f.id === id)
    if (index === -1) throw new Error('Folder not found')

    const folder = {
      ...data.folders[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    data.folders[index] = folder
    saveDatabase()
    return folder
  },

  delete(id: string): void {
    const data = getData()
    data.folders = data.folders.filter((f) => f.id !== id)
    // Also delete child folders and requests
    data.folders = data.folders.filter((f) => f.parentId !== id)
    data.requests = data.requests.filter((r) => r.folderId !== id)
    saveDatabase()
  }
}

// Requests repository
export const requestsRepo = {
  getByCollection(collectionId: string): CollectionRequest[] {
    return getData()
      .requests.filter((r) => r.collectionId === collectionId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },

  save(collectionId: string, request: Request, folderId?: string): CollectionRequest {
    const data = getData()
    const collectionRequests = data.requests.filter((r) => r.collectionId === collectionId)
    const maxOrder = collectionRequests.reduce((max, r) => Math.max(max, r.sortOrder), -1)

    const collectionRequest: CollectionRequest = {
      id: uuidv4(),
      collectionId,
      folderId,
      request,
      sortOrder: maxOrder + 1
    }
    data.requests.push(collectionRequest)
    saveDatabase()
    return collectionRequest
  },

  update(id: string, request: Request): CollectionRequest {
    const data = getData()
    const index = data.requests.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Request not found')

    const collectionRequest = {
      ...data.requests[index],
      request
    }
    data.requests[index] = collectionRequest
    saveDatabase()
    return collectionRequest
  },

  delete(id: string): void {
    const data = getData()
    data.requests = data.requests.filter((r) => r.id !== id)
    saveDatabase()
  }
}

// Environments repository
export const environmentsRepo = {
  getAll(): Environment[] {
    return getData().environments.sort((a, b) => a.name.localeCompare(b.name))
  },

  create(name: string): Environment {
    const data = getData()
    const now = new Date().toISOString()
    const environment: Environment = {
      id: uuidv4(),
      name,
      variables: [],
      isActive: false,
      createdAt: now,
      updatedAt: now
    }
    data.environments.push(environment)
    saveDatabase()
    return environment
  },

  update(id: string, updates: Partial<Environment>): Environment {
    const data = getData()
    const index = data.environments.findIndex((e) => e.id === id)
    if (index === -1) throw new Error('Environment not found')

    const environment = {
      ...data.environments[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    data.environments[index] = environment
    saveDatabase()
    return environment
  },

  setActive(id: string | null): void {
    const data = getData()
    data.environments.forEach((e) => {
      e.isActive = e.id === id
    })
    saveDatabase()
  },

  delete(id: string): void {
    const data = getData()
    data.environments = data.environments.filter((e) => e.id !== id)
    saveDatabase()
  }
}

// History repository
export const historyRepo = {
  getAll(limit = 100): HistoryEntry[] {
    return getData()
      .history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  },

  add(request: Request, response?: Response): HistoryEntry {
    const data = getData()
    const entry: HistoryEntry = {
      id: uuidv4(),
      request,
      response,
      timestamp: new Date().toISOString()
    }
    data.history.push(entry)

    // Keep only last 1000 entries
    if (data.history.length > 1000) {
      data.history = data.history
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000)
    }

    saveDatabase()
    return entry
  },

  clear(): void {
    const data = getData()
    data.history = []
    saveDatabase()
  }
}
