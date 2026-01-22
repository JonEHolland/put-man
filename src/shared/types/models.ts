// Request types
export type RequestType = 'http' | 'graphql' | 'grpc' | 'websocket' | 'sse'
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
    grantType: 'authorization_code' | 'client_credentials'
    usePkce?: boolean
    accessToken?: string
    tokenType?: string
    refreshToken?: string
    expiresAt?: number
    clientId?: string
    clientSecret?: string
    authUrl?: string
    tokenUrl?: string
    redirectUri?: string
    scope?: string
    audience?: string
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

// WebSocket Request
export interface WebSocketRequest {
  id: string
  name: string
  type: 'websocket'
  url: string
  headers: KeyValuePair[]
  auth: AuthConfig
  createdAt: string
  updatedAt: string
}

// WebSocket Message
export type WebSocketMessageDirection = 'sent' | 'received'
export type WebSocketMessageType = 'text' | 'binary' | 'ping' | 'pong' | 'system'

export interface WebSocketMessage {
  id: string
  direction: WebSocketMessageDirection
  type: WebSocketMessageType
  payload: string
  timestamp: string
}

// WebSocket Connection State
export type WebSocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface WebSocketConnectionState {
  status: WebSocketConnectionStatus
  error?: string
  messages: WebSocketMessage[]
  connectedAt?: string
}

// SSE (Server-Sent Events) Request
export interface SSERequest {
  id: string
  name: string
  type: 'sse'
  url: string
  headers: KeyValuePair[]
  auth: AuthConfig
  createdAt: string
  updatedAt: string
}

// SSE Event
export interface SSEEvent {
  id: string
  eventId?: string // SSE event id field
  eventType: string // SSE event type (defaults to 'message')
  data: string
  timestamp: string
}

// SSE Connection State
export type SSEConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface SSEConnectionState {
  status: SSEConnectionStatus
  error?: string
  events: SSEEvent[]
  connectedAt?: string
  lastEventId?: string
}

export type Request = HttpRequest | GraphQLRequest | GrpcRequest | WebSocketRequest | SSERequest

// Script execution results
export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

export interface ScriptResult {
  success: boolean
  error?: string
  consoleLogs: string[]
  environmentUpdates: Record<string, string>
  testResults: TestResult[]
  duration: number
}

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
  // Script execution results
  preRequestScriptResult?: ScriptResult
  testScriptResult?: ScriptResult
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
  isLoading: boolean
  collectionRequestId?: string
  // WebSocket state (only for websocket tabs)
  wsState?: WebSocketConnectionState
  // SSE state (only for sse tabs)
  sseState?: SSEConnectionState
}

// OAuth2 token response
export interface OAuth2TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn?: number
  refreshToken?: string
  scope?: string
}

// OAuth2 config type for service calls
export type OAuth2Config = NonNullable<AuthConfig['oauth2']>

// Code generation
export type CodeLanguage = 'curl' | 'javascript-fetch' | 'javascript-axios' | 'python-requests' | 'go' | 'php-curl'

export interface CodeLanguageOption {
  id: CodeLanguage
  name: string
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
    moveRequest: (id: string, targetFolderId: string | null) => Promise<CollectionRequest>

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

  // Code generation
  codeGen: {
    generate: (language: CodeLanguage, request: HttpRequest, includeComments?: boolean) => Promise<string>
    getSupportedLanguages: () => Promise<CodeLanguageOption[]>
  }

  // OAuth2
  oauth2: {
    startAuthCodeFlow: (config: OAuth2Config, environment?: Environment) => Promise<OAuth2TokenResponse>
    clientCredentialsFlow: (config: OAuth2Config, environment?: Environment) => Promise<OAuth2TokenResponse>
    refreshToken: (config: OAuth2Config, environment?: Environment) => Promise<OAuth2TokenResponse>
  }

  // WebSocket operations
  websocket: {
    connect: (connectionId: string, request: WebSocketRequest, environment?: Environment) => Promise<void>
    disconnect: (connectionId: string) => Promise<void>
    send: (connectionId: string, message: string) => Promise<void>
    onMessage: (callback: (connectionId: string, message: WebSocketMessage) => void) => () => void
    onStatusChange: (callback: (connectionId: string, status: WebSocketConnectionStatus, error?: string) => void) => () => void
  }

  // SSE operations
  sse: {
    connect: (connectionId: string, request: SSERequest, environment?: Environment) => Promise<void>
    disconnect: (connectionId: string) => Promise<void>
    onEvent: (callback: (connectionId: string, event: SSEEvent) => void) => () => void
    onStatusChange: (callback: (connectionId: string, status: SSEConnectionStatus, error?: string) => void) => () => void
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
