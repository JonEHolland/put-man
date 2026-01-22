import { contextBridge, ipcRenderer } from 'electron'
import type {
  Collection,
  Folder,
  Request,
  HttpRequest,
  WebSocketRequest,
  WebSocketMessage,
  WebSocketConnectionStatus,
  SSERequest,
  SSEEvent,
  SSEConnectionStatus,
  Environment,
  Response,
  CollectionRequest,
  HistoryEntry,
  ElectronAPI,
  CodeLanguage,
  OAuth2Config
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
    moveRequest: (id: string, targetFolderId: string | null) =>
      ipcRenderer.invoke('db:moveRequest', id, targetFolderId),

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
    introspect: (url: string, headers?: any[], environment?: Environment) =>
      ipcRenderer.invoke('graphql:introspect', url, headers, environment),
    cancel: (requestId: string) => ipcRenderer.invoke('graphql:cancel', requestId)
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
  },

  codeGen: {
    generate: (language: CodeLanguage, request: HttpRequest, includeComments?: boolean) =>
      ipcRenderer.invoke('codeGen:generate', language, request, includeComments),
    getSupportedLanguages: () => ipcRenderer.invoke('codeGen:getSupportedLanguages')
  },

  oauth2: {
    startAuthCodeFlow: (config: OAuth2Config, environment?: Environment) =>
      ipcRenderer.invoke('oauth2:authCodeFlow', config, environment),
    clientCredentialsFlow: (config: OAuth2Config, environment?: Environment) =>
      ipcRenderer.invoke('oauth2:clientCredentials', config, environment),
    refreshToken: (config: OAuth2Config, environment?: Environment) =>
      ipcRenderer.invoke('oauth2:refreshToken', config, environment)
  },

  websocket: {
    connect: (connectionId: string, request: WebSocketRequest, environment?: Environment) =>
      ipcRenderer.invoke('websocket:connect', connectionId, request, environment),
    disconnect: (connectionId: string) =>
      ipcRenderer.invoke('websocket:disconnect', connectionId),
    send: (connectionId: string, message: string) =>
      ipcRenderer.invoke('websocket:send', connectionId, message),
    onMessage: (callback: (connectionId: string, message: WebSocketMessage) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, connId: string, msg: WebSocketMessage) => {
        callback(connId, msg)
      }
      ipcRenderer.on('websocket:message', listener)
      return () => {
        ipcRenderer.removeListener('websocket:message', listener)
      }
    },
    onStatusChange: (callback: (connectionId: string, status: WebSocketConnectionStatus, error?: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, connId: string, status: WebSocketConnectionStatus, error?: string) => {
        callback(connId, status, error)
      }
      ipcRenderer.on('websocket:statusChange', listener)
      return () => {
        ipcRenderer.removeListener('websocket:statusChange', listener)
      }
    }
  },

  sse: {
    connect: (connectionId: string, request: SSERequest, environment?: Environment) =>
      ipcRenderer.invoke('sse:connect', connectionId, request, environment),
    disconnect: (connectionId: string) =>
      ipcRenderer.invoke('sse:disconnect', connectionId),
    onEvent: (callback: (connectionId: string, event: SSEEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, connId: string, sseEvent: SSEEvent) => {
        callback(connId, sseEvent)
      }
      ipcRenderer.on('sse:event', listener)
      return () => {
        ipcRenderer.removeListener('sse:event', listener)
      }
    },
    onStatusChange: (callback: (connectionId: string, status: SSEConnectionStatus, error?: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, connId: string, status: SSEConnectionStatus, error?: string) => {
        callback(connId, status, error)
      }
      ipcRenderer.on('sse:statusChange', listener)
      return () => {
        ipcRenderer.removeListener('sse:statusChange', listener)
      }
    }
  },

  menu: {
    onNewRequest: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('menu:new-request', listener)
      return () => {
        ipcRenderer.removeListener('menu:new-request', listener)
      }
    },
    onNewCollection: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('menu:new-collection', listener)
      return () => {
        ipcRenderer.removeListener('menu:new-collection', listener)
      }
    },
    onImport: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('menu:import', listener)
      return () => {
        ipcRenderer.removeListener('menu:import', listener)
      }
    },
    onExport: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('menu:export', listener)
      return () => {
        ipcRenderer.removeListener('menu:export', listener)
      }
    },
    onCloseTab: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('menu:close-tab', listener)
      return () => {
        ipcRenderer.removeListener('menu:close-tab', listener)
      }
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
