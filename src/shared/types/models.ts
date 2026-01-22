// Request types
export type RequestType = 'http' | 'graphql' | 'grpc'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

// Key-value pairs (headers, params)
export interface KeyValuePair {
  id: string
  key: string
  value: string
  enabled: boolean
}

// Request body types
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary'

export interface RequestBody {
  type: BodyType
  content: string
  formData?: KeyValuePair[]
}

// Authentication types
export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'aws-sig-v4'

export interface AuthConfig {
  type: AuthType
  basic?: { username: string; password: string }
  bearer?: { token: string }
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' }
  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials' | 'pkce'
    accessToken?: string
    clientId?: string
    clientSecret?: string
    authUrl?: string
    tokenUrl?: string
    redirectUri?: string
    scope?: string
  }
  awsSigV4?: {
    accessKey: string
    secretKey: string
    region: string
    service: string
  }
}

// HTTP Request
export interface HttpRequest {
  id: string
  name: string
  type: 'http'
  method: HttpMethod
  url: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  body: RequestBody
  auth: AuthConfig
  preRequestScript?: string
  testScript?: string
  createdAt: string
  updatedAt: string
}

// GraphQL Request
export interface GraphQLRequest {
  id: string
  name: string
  type: 'graphql'
  url: string
  query: string
  variables: string
  headers: KeyValuePair[]
  auth: AuthConfig
  preRequestScript?: string
  testScript?: string
  createdAt: string
  updatedAt: string
}

// gRPC Request
export interface GrpcRequest {
  id: string
  name: string
  type: 'grpc'
  url: string
  protoFile?: string
  serviceName?: string
  methodName?: string
  message: string
  metadata: KeyValuePair[]
  auth: AuthConfig
  preRequestScript?: string
  testScript?: string
  createdAt: string
  updatedAt: string
}

export type Request = HttpRequest | GraphQLRequest | GrpcRequest

// Response
export interface Response {
  id: string
  requestId: string
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  size: number
  time: number
  timestamp: string
}

// Collections
export interface Collection {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Folder {
  id: string
  collectionId: string
  parentId?: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface CollectionRequest {
  id: string
  collectionId: string
  folderId?: string
  request: Request
  sortOrder: number
}

// Environments
export interface EnvironmentVariable {
  id: string
  key: string
  value: string
  enabled: boolean
}

export interface Environment {
  id: string
  name: string
  variables: EnvironmentVariable[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// History
export interface HistoryEntry {
  id: string
  request: Request
  response?: Response
  timestamp: string
}

// Tab state
export interface Tab {
  id: string
  title: string
  request: Request
  response?: Response
  isDirty: boolean
  collectionRequestId?: string
}

// IPC API types
export interface ElectronAPI {
  // Database operations
  db: {
    // Collections
    getCollections: () => Promise<Collection[]>
    createCollection: (name: string, description?: string) => Promise<Collection>
    updateCollection: (id: string, updates: Partial<Collection>) => Promise<Collection>
    deleteCollection: (id: string) => Promise<void>

    // Folders
    getFolders: (collectionId: string) => Promise<Folder[]>
    createFolder: (collectionId: string, name: string, parentId?: string) => Promise<Folder>
    updateFolder: (id: string, updates: Partial<Folder>) => Promise<Folder>
    deleteFolder: (id: string) => Promise<void>

    // Requests
    getCollectionRequests: (collectionId: string) => Promise<CollectionRequest[]>
    saveRequest: (collectionId: string, request: Request, folderId?: string) => Promise<CollectionRequest>
    updateRequest: (id: string, request: Request) => Promise<CollectionRequest>
    deleteRequest: (id: string) => Promise<void>

    // Environments
    getEnvironments: () => Promise<Environment[]>
    createEnvironment: (name: string) => Promise<Environment>
    updateEnvironment: (id: string, updates: Partial<Environment>) => Promise<Environment>
    deleteEnvironment: (id: string) => Promise<void>
    setActiveEnvironment: (id: string | null) => Promise<void>

    // History
    getHistory: (limit?: number) => Promise<HistoryEntry[]>
    addToHistory: (request: Request, response?: Response) => Promise<HistoryEntry>
    clearHistory: () => Promise<void>
  }

  // HTTP operations
  http: {
    send: (request: HttpRequest, environment?: Environment) => Promise<Response>
    cancel: (requestId: string) => Promise<void>
  }

  // GraphQL operations
  graphql: {
    send: (request: GraphQLRequest, environment?: Environment) => Promise<Response>
    introspect: (url: string, headers?: KeyValuePair[]) => Promise<string>
  }

  // gRPC operations
  grpc: {
    send: (request: GrpcRequest, environment?: Environment) => Promise<Response>
    loadProto: (filePath: string) => Promise<{ services: string[]; methods: Record<string, string[]> }>
    reflect: (url: string) => Promise<{ services: string[]; methods: Record<string, string[]> }>
  }

  // File operations
  file: {
    openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<{ path: string; content: string } | null>
    saveFile: (content: string, defaultPath?: string) => Promise<string | null>
  }

  // Import/Export
  import: {
    postmanCollection: (filePath: string) => Promise<Collection>
    openApi: (filePath: string) => Promise<Collection>
    curl: (curlCommand: string) => Promise<Request>
  }

  export: {
    collection: (collectionId: string, format: 'native' | 'postman') => Promise<string>
    curl: (request: Request) => Promise<string>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
