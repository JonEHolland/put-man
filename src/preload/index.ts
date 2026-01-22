import { contextBridge, ipcRenderer } from 'electron'
import type {
  Collection,
  Folder,
  Request,
  Environment,
  Response,
  CollectionRequest,
  HistoryEntry,
  ElectronAPI
} from '../shared/types/models'

const api: ElectronAPI = {
  db: {
    // Collections
    getCollections: () => ipcRenderer.invoke('db:getCollections'),
    createCollection: (name: string, description?: string) =>
      ipcRenderer.invoke('db:createCollection', name, description),
    updateCollection: (id: string, updates: Partial<Collection>) =>
      ipcRenderer.invoke('db:updateCollection', id, updates),
    deleteCollection: (id: string) => ipcRenderer.invoke('db:deleteCollection', id),

    // Folders
    getFolders: (collectionId: string) => ipcRenderer.invoke('db:getFolders', collectionId),
    createFolder: (collectionId: string, name: string, parentId?: string) =>
      ipcRenderer.invoke('db:createFolder', collectionId, name, parentId),
    updateFolder: (id: string, updates: Partial<Folder>) =>
      ipcRenderer.invoke('db:updateFolder', id, updates),
    deleteFolder: (id: string) => ipcRenderer.invoke('db:deleteFolder', id),

    // Requests
    getCollectionRequests: (collectionId: string) =>
      ipcRenderer.invoke('db:getCollectionRequests', collectionId),
    saveRequest: (collectionId: string, request: Request, folderId?: string) =>
      ipcRenderer.invoke('db:saveRequest', collectionId, request, folderId),
    updateRequest: (id: string, request: Request) =>
      ipcRenderer.invoke('db:updateRequest', id, request),
    deleteRequest: (id: string) => ipcRenderer.invoke('db:deleteRequest', id),

    // Environments
    getEnvironments: () => ipcRenderer.invoke('db:getEnvironments'),
    createEnvironment: (name: string) => ipcRenderer.invoke('db:createEnvironment', name),
    updateEnvironment: (id: string, updates: Partial<Environment>) =>
      ipcRenderer.invoke('db:updateEnvironment', id, updates),
    deleteEnvironment: (id: string) => ipcRenderer.invoke('db:deleteEnvironment', id),
    setActiveEnvironment: (id: string | null) =>
      ipcRenderer.invoke('db:setActiveEnvironment', id),

    // History
    getHistory: (limit?: number) => ipcRenderer.invoke('db:getHistory', limit),
    addToHistory: (request: Request, response?: Response) =>
      ipcRenderer.invoke('db:addToHistory', request, response),
    clearHistory: () => ipcRenderer.invoke('db:clearHistory')
  },

  http: {
    send: (request: Request, environment?: Environment) =>
      ipcRenderer.invoke('http:send', request, environment),
    cancel: (requestId: string) => ipcRenderer.invoke('http:cancel', requestId)
  },

  graphql: {
    send: (request: Request, environment?: Environment) =>
      ipcRenderer.invoke('graphql:send', request, environment),
    introspect: (url: string, headers?: any[]) =>
      ipcRenderer.invoke('graphql:introspect', url, headers)
  },

  grpc: {
    send: (request: Request, environment?: Environment) =>
      ipcRenderer.invoke('grpc:send', request, environment),
    loadProto: (filePath: string) => ipcRenderer.invoke('grpc:loadProto', filePath),
    reflect: (url: string) => ipcRenderer.invoke('grpc:reflect', url)
  },

  file: {
    openFile: (filters?: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('file:open', filters),
    saveFile: (content: string, defaultPath?: string) =>
      ipcRenderer.invoke('file:save', content, defaultPath)
  },

  import: {
    postmanCollection: (filePath: string) =>
      ipcRenderer.invoke('import:postmanCollection', filePath),
    openApi: (filePath: string) => ipcRenderer.invoke('import:openApi', filePath),
    curl: (curlCommand: string) => ipcRenderer.invoke('import:curl', curlCommand)
  },

  export: {
    collection: (collectionId: string, format: 'native' | 'postman') =>
      ipcRenderer.invoke('export:collection', collectionId, format),
    curl: (request: Request) => ipcRenderer.invoke('export:curl', request)
  }
}

contextBridge.exposeInMainWorld('api', api)
