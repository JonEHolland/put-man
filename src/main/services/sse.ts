import axios, { AxiosResponse } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { BrowserWindow } from 'electron'
import type {
  SSERequest,
  SSEEvent,
  SSEConnectionStatus,
  Environment,
  KeyValuePair
} from '../../shared/types/models'

interface SSEConnection {
  connectionId: string
  status: SSEConnectionStatus
  abortController: AbortController
  lastEventId?: string
}

// Store active SSE connections
const connections = new Map<string, SSEConnection>()

function interpolateVariables(text: string, environment?: Environment): string {
  if (!environment) return text

  let result = text
  for (const variable of environment.variables) {
    if (variable.enabled) {
      const pattern = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g')
      result = result.replace(pattern, variable.value)
    }
  }
  return result
}

function buildHeaders(
  headers: KeyValuePair[],
  environment?: Environment
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const header of headers) {
    if (header.enabled) {
      result[interpolateVariables(header.key, environment)] = interpolateVariables(
        header.value,
        environment
      )
    }
  }
  return result
}

function applyAuth(
  request: SSERequest,
  headers: Record<string, string>,
  environment?: Environment
): void {
  const { auth } = request

  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        const username = interpolateVariables(auth.basic.username, environment)
        const password = interpolateVariables(auth.basic.password, environment)
        const credentials = Buffer.from(`${username}:${password}`).toString('base64')
        headers['Authorization'] = `Basic ${credentials}`
      }
      break
    case 'bearer':
      if (auth.bearer) {
        const token = interpolateVariables(auth.bearer.token, environment)
        headers['Authorization'] = `Bearer ${token}`
      }
      break
    case 'api-key':
      if (auth.apiKey && auth.apiKey.addTo === 'header') {
        const key = interpolateVariables(auth.apiKey.key, environment)
        const value = interpolateVariables(auth.apiKey.value, environment)
        headers[key] = value
      }
      break
    case 'oauth2':
      if (auth.oauth2?.accessToken) {
        const tokenType = auth.oauth2.tokenType || 'Bearer'
        const token = interpolateVariables(auth.oauth2.accessToken, environment)
        headers['Authorization'] = `${tokenType} ${token}`
      }
      break
  }
}

function notifyStatusChange(
  connectionId: string,
  status: SSEConnectionStatus,
  error?: string
): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('sse:statusChange', connectionId, status, error)
  }
}

function notifyEvent(connectionId: string, event: SSEEvent): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('sse:event', connectionId, event)
  }
}

// Parse SSE data from a buffer chunk
interface SSEParseState {
  buffer: string
  currentEvent: {
    id?: string
    type: string
    data: string[]
  }
}

function createParseState(): SSEParseState {
  return {
    buffer: '',
    currentEvent: { type: 'message', data: [] }
  }
}

function parseSSEChunk(
  state: SSEParseState,
  chunk: string,
  onEvent: (event: { id?: string; type: string; data: string }) => void
): void {
  state.buffer += chunk

  // Split by newlines but keep track of double newlines (event boundaries)
  const lines = state.buffer.split('\n')

  // Keep the last incomplete line in the buffer
  state.buffer = lines.pop() || ''

  for (const line of lines) {
    if (line === '') {
      // Empty line = end of event
      if (state.currentEvent.data.length > 0) {
        onEvent({
          id: state.currentEvent.id,
          type: state.currentEvent.type,
          data: state.currentEvent.data.join('\n')
        })
      }
      // Reset for next event
      state.currentEvent = { type: 'message', data: [] }
    } else if (line.startsWith(':')) {
      // Comment line, ignore
    } else if (line.startsWith('data:')) {
      const data = line.slice(5).trimStart()
      state.currentEvent.data.push(data)
    } else if (line.startsWith('event:')) {
      state.currentEvent.type = line.slice(6).trim()
    } else if (line.startsWith('id:')) {
      state.currentEvent.id = line.slice(3).trim()
    } else if (line.startsWith('retry:')) {
      // Retry field - could implement reconnection delay here
    }
  }
}

export const sseService = {
  async connect(
    connectionId: string,
    request: SSERequest,
    environment?: Environment
  ): Promise<void> {
    // Close any existing connection with this ID
    await this.disconnect(connectionId)

    const url = interpolateVariables(request.url, environment)
    const headers = buildHeaders(request.headers, environment)
    applyAuth(request, headers, environment)

    // Add SSE-specific headers
    headers['Accept'] = 'text/event-stream'
    headers['Cache-Control'] = 'no-cache'

    const abortController = new AbortController()

    const connection: SSEConnection = {
      connectionId,
      status: 'connecting',
      abortController
    }
    connections.set(connectionId, connection)

    notifyStatusChange(connectionId, 'connecting')

    try {
      const response: AxiosResponse = await axios.get(url, {
        headers,
        responseType: 'stream',
        signal: abortController.signal,
        // Don't timeout the connection
        timeout: 0
      })

      // Check if it's actually an SSE response
      const contentType = response.headers['content-type'] || ''
      if (!contentType.includes('text/event-stream')) {
        throw new Error(`Expected text/event-stream but got ${contentType}`)
      }

      connection.status = 'connected'
      notifyStatusChange(connectionId, 'connected')

      // Send system event about connection
      const systemEvent: SSEEvent = {
        id: uuidv4(),
        eventType: 'system',
        data: `Connected to ${url}`,
        timestamp: new Date().toISOString()
      }
      notifyEvent(connectionId, systemEvent)

      // Parse the SSE stream
      const parseState = createParseState()

      response.data.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')

        parseSSEChunk(parseState, text, (parsedEvent) => {
          // Update last event ID
          if (parsedEvent.id) {
            connection.lastEventId = parsedEvent.id
          }

          const sseEvent: SSEEvent = {
            id: uuidv4(),
            eventId: parsedEvent.id,
            eventType: parsedEvent.type,
            data: parsedEvent.data,
            timestamp: new Date().toISOString()
          }
          notifyEvent(connectionId, sseEvent)
        })
      })

      response.data.on('end', () => {
        connection.status = 'disconnected'
        connections.delete(connectionId)
        notifyStatusChange(connectionId, 'disconnected')

        const systemEvent: SSEEvent = {
          id: uuidv4(),
          eventType: 'system',
          data: 'Stream ended',
          timestamp: new Date().toISOString()
        }
        notifyEvent(connectionId, systemEvent)
      })

      response.data.on('error', (error: Error) => {
        // Only report error if not aborted by user
        if (!abortController.signal.aborted) {
          connection.status = 'error'
          connections.delete(connectionId)
          notifyStatusChange(connectionId, 'error', error.message)

          const systemEvent: SSEEvent = {
            id: uuidv4(),
            eventType: 'system',
            data: `Error: ${error.message}`,
            timestamp: new Date().toISOString()
          }
          notifyEvent(connectionId, systemEvent)
        }
      })
    } catch (error) {
      // Check if aborted by user
      if (axios.isCancel(error)) {
        connection.status = 'disconnected'
        connections.delete(connectionId)
        notifyStatusChange(connectionId, 'disconnected')
        return
      }

      connection.status = 'error'
      connections.delete(connectionId)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      notifyStatusChange(connectionId, 'error', errorMessage)

      const systemEvent: SSEEvent = {
        id: uuidv4(),
        eventType: 'system',
        data: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString()
      }
      notifyEvent(connectionId, systemEvent)

      throw error
    }
  },

  async disconnect(connectionId: string): Promise<void> {
    const connection = connections.get(connectionId)
    if (connection) {
      connection.abortController.abort()
      connection.status = 'disconnected'
      connections.delete(connectionId)
      notifyStatusChange(connectionId, 'disconnected')
    }
  },

  getConnectionStatus(connectionId: string): SSEConnectionStatus {
    const connection = connections.get(connectionId)
    return connection?.status || 'disconnected'
  },

  isConnected(connectionId: string): boolean {
    const connection = connections.get(connectionId)
    return connection?.status === 'connected'
  },

  getLastEventId(connectionId: string): string | undefined {
    const connection = connections.get(connectionId)
    return connection?.lastEventId
  },

  closeAll(): void {
    for (const [, connection] of connections) {
      connection.abortController.abort()
    }
    connections.clear()
  }
}
