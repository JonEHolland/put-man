import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { BrowserWindow } from 'electron'
import type {
  WebSocketRequest,
  WebSocketMessage,
  WebSocketConnectionStatus,
  Environment,
  KeyValuePair
} from '../../shared/types/models'

interface WebSocketConnection {
  ws: WebSocket
  connectionId: string
  status: WebSocketConnectionStatus
}

// Store active WebSocket connections
const connections = new Map<string, WebSocketConnection>()

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
  request: WebSocketRequest,
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
  status: WebSocketConnectionStatus,
  error?: string
): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('websocket:statusChange', connectionId, status, error)
  }
}

function notifyMessage(connectionId: string, message: WebSocketMessage): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('websocket:message', connectionId, message)
  }
}

export const websocketService = {
  async connect(
    connectionId: string,
    request: WebSocketRequest,
    environment?: Environment
  ): Promise<void> {
    // Close any existing connection with this ID
    await this.disconnect(connectionId)

    const url = interpolateVariables(request.url, environment)
    const headers = buildHeaders(request.headers, environment)
    applyAuth(request, headers, environment)

    return new Promise((resolve, reject) => {
      try {
        notifyStatusChange(connectionId, 'connecting')

        const ws = new WebSocket(url, {
          headers,
          handshakeTimeout: 10000
        })

        const connection: WebSocketConnection = {
          ws,
          connectionId,
          status: 'connecting'
        }

        connections.set(connectionId, connection)

        ws.on('open', () => {
          connection.status = 'connected'
          notifyStatusChange(connectionId, 'connected')

          // Send system message about connection
          const systemMessage: WebSocketMessage = {
            id: uuidv4(),
            direction: 'received',
            type: 'system',
            payload: `Connected to ${url}`,
            timestamp: new Date().toISOString()
          }
          notifyMessage(connectionId, systemMessage)

          resolve()
        })

        ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
          const message: WebSocketMessage = {
            id: uuidv4(),
            direction: 'received',
            type: isBinary ? 'binary' : 'text',
            payload: isBinary ? `[Binary data: ${data.toString('hex').slice(0, 100)}...]` : data.toString(),
            timestamp: new Date().toISOString()
          }
          notifyMessage(connectionId, message)
        })

        ws.on('ping', (data: Buffer) => {
          const message: WebSocketMessage = {
            id: uuidv4(),
            direction: 'received',
            type: 'ping',
            payload: data.toString() || '[ping]',
            timestamp: new Date().toISOString()
          }
          notifyMessage(connectionId, message)
        })

        ws.on('pong', (data: Buffer) => {
          const message: WebSocketMessage = {
            id: uuidv4(),
            direction: 'received',
            type: 'pong',
            payload: data.toString() || '[pong]',
            timestamp: new Date().toISOString()
          }
          notifyMessage(connectionId, message)
        })

        ws.on('close', (code: number, reason: Buffer) => {
          connection.status = 'disconnected'
          connections.delete(connectionId)

          const reasonStr = reason.toString() || 'Connection closed'
          notifyStatusChange(connectionId, 'disconnected')

          // Send system message about disconnection
          const systemMessage: WebSocketMessage = {
            id: uuidv4(),
            direction: 'received',
            type: 'system',
            payload: `Disconnected (code: ${code}, reason: ${reasonStr})`,
            timestamp: new Date().toISOString()
          }
          notifyMessage(connectionId, systemMessage)
        })

        ws.on('error', (error: Error) => {
          connection.status = 'error'
          connections.delete(connectionId)
          notifyStatusChange(connectionId, 'error', error.message)

          // Send system message about error
          const systemMessage: WebSocketMessage = {
            id: uuidv4(),
            direction: 'received',
            type: 'system',
            payload: `Error: ${error.message}`,
            timestamp: new Date().toISOString()
          }
          notifyMessage(connectionId, systemMessage)

          // Only reject if we haven't resolved yet (during connection phase)
          if (connection.status === 'connecting') {
            reject(error)
          }
        })
      } catch (error) {
        notifyStatusChange(connectionId, 'error', (error as Error).message)
        reject(error)
      }
    })
  },

  async disconnect(connectionId: string): Promise<void> {
    const connection = connections.get(connectionId)
    if (connection) {
      connection.ws.close(1000, 'User disconnected')
      connections.delete(connectionId)
      notifyStatusChange(connectionId, 'disconnected')
    }
  },

  async send(connectionId: string, message: string): Promise<void> {
    const connection = connections.get(connectionId)
    if (!connection) {
      throw new Error('No active connection')
    }

    if (connection.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    return new Promise((resolve, reject) => {
      connection.ws.send(message, (error) => {
        if (error) {
          reject(error)
          return
        }

        // Notify about sent message
        const sentMessage: WebSocketMessage = {
          id: uuidv4(),
          direction: 'sent',
          type: 'text',
          payload: message,
          timestamp: new Date().toISOString()
        }
        notifyMessage(connectionId, sentMessage)
        resolve()
      })
    })
  },

  getConnectionStatus(connectionId: string): WebSocketConnectionStatus {
    const connection = connections.get(connectionId)
    return connection?.status || 'disconnected'
  },

  isConnected(connectionId: string): boolean {
    const connection = connections.get(connectionId)
    return connection?.ws.readyState === WebSocket.OPEN
  },

  closeAll(): void {
    for (const [connectionId, connection] of connections) {
      connection.ws.close(1000, 'Application shutdown')
      connections.delete(connectionId)
    }
  }
}
