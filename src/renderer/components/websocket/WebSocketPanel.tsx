import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import VariableHighlightInput from '../common/VariableHighlightInput'
import HeadersEditor from '../request/HeadersEditor'
import AuthPanel from '../request/AuthPanel'
import type {
  Tab,
  WebSocketRequest,
  WebSocketMessage,
  WebSocketConnectionStatus
} from '../../../shared/types/models'

type ConfigTab = 'headers' | 'auth'

interface WebSocketPanelProps {
  tab: Tab
}

export default function WebSocketPanel({ tab }: WebSocketPanelProps) {
  const { updateTab } = useAppStore()
  const { activeEnvironment } = useEnvironmentStore()
  const [configTab, setConfigTab] = useState<ConfigTab>('headers')
  const [messageInput, setMessageInput] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const request = tab.request as WebSocketRequest
  const wsState = tab.wsState || {
    status: 'disconnected' as WebSocketConnectionStatus,
    messages: []
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [wsState.messages])

  // Set up WebSocket event listeners
  useEffect(() => {
    const unsubMessage = window.api.websocket.onMessage((connId, message) => {
      if (connId === tab.id) {
        updateTab(tab.id, {
          wsState: {
            ...wsState,
            messages: [...wsState.messages, message]
          }
        })
      }
    })

    const unsubStatus = window.api.websocket.onStatusChange((connId, status, error) => {
      if (connId === tab.id) {
        updateTab(tab.id, {
          wsState: {
            ...wsState,
            status,
            error,
            connectedAt: status === 'connected' ? new Date().toISOString() : wsState.connectedAt
          }
        })
        setIsConnecting(false)
      }
    })

    return () => {
      unsubMessage()
      unsubStatus()
    }
  }, [tab.id, wsState, updateTab])

  const handleUrlChange = (url: string) => {
    updateTab(tab.id, {
      request: { ...request, url },
      title: url || 'WebSocket',
      isDirty: true
    })
  }

  const handleConnect = async () => {
    if (wsState.status === 'connected') {
      await window.api.websocket.disconnect(tab.id)
    } else {
      setIsConnecting(true)
      try {
        await window.api.websocket.connect(tab.id, request, activeEnvironment || undefined)
      } catch (error) {
        setIsConnecting(false)
        updateTab(tab.id, {
          wsState: {
            ...wsState,
            status: 'error',
            error: (error as Error).message
          }
        })
      }
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || wsState.status !== 'connected') return

    try {
      await window.api.websocket.send(tab.id, messageInput)
      setMessageInput('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearMessages = () => {
    updateTab(tab.id, {
      wsState: {
        ...wsState,
        messages: []
      }
    })
  }

  const getStatusColor = (status: WebSocketConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const isConnected = wsState.status === 'connected'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* URL Bar and Connect Button */}
      <div className="flex items-center gap-2 p-3 bg-panel border-b border-panel-border">
        <span className="text-purple-400 font-semibold text-sm px-2">WS</span>
        <VariableHighlightInput
          value={request.url}
          onChange={handleUrlChange}
          placeholder="ws://localhost:8080 or wss://example.com/ws"
          className="input flex-1"
          disabled={isConnected}
        />
        <button
          className={`btn px-6 ${
            isConnected
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'btn-primary'
          }`}
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Connecting...
            </span>
          ) : isConnected ? (
            'Disconnect'
          ) : (
            'Connect'
          )}
        </button>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-sidebar border-b border-panel-border">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(wsState.status)}`} />
          <span className="text-sm text-gray-400 capitalize">{wsState.status}</span>
        </div>
        {wsState.connectedAt && isConnected && (
          <span className="text-xs text-gray-500">
            Connected since {new Date(wsState.connectedAt).toLocaleTimeString()}
          </span>
        )}
        {wsState.error && (
          <span className="text-xs text-red-400">{wsState.error}</span>
        )}
        <span className="ml-auto text-xs text-gray-500">
          {wsState.messages.length} messages
        </span>
      </div>

      {/* Config tabs */}
      <div className="flex border-b border-panel-border bg-sidebar">
        <button
          className={`tab ${configTab === 'headers' ? 'active' : ''}`}
          onClick={() => setConfigTab('headers')}
        >
          Headers
          {request.headers.filter((h) => h.enabled).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-600 rounded-full">
              {request.headers.filter((h) => h.enabled).length}
            </span>
          )}
        </button>
        <button
          className={`tab ${configTab === 'auth' ? 'active' : ''}`}
          onClick={() => setConfigTab('auth')}
        >
          Auth
        </button>
      </div>

      {/* Config content */}
      <div className="h-32 overflow-auto bg-panel border-b border-panel-border">
        {configTab === 'headers' && <HeadersEditor tab={tab} />}
        {configTab === 'auth' && <AuthPanel tab={tab} />}
      </div>

      {/* Messages Panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-editor">
        {/* Messages header */}
        <div className="flex items-center justify-between px-4 py-2 bg-panel border-b border-panel-border">
          <span className="text-sm font-semibold text-gray-300">Messages</span>
          {wsState.messages.length > 0 && (
            <button
              className="text-xs text-gray-400 hover:text-gray-200"
              onClick={handleClearMessages}
            >
              Clear
            </button>
          )}
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-auto p-2 space-y-2">
          {wsState.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {isConnected
                ? 'No messages yet. Send a message or wait for incoming data.'
                : 'Connect to start sending and receiving messages.'}
            </div>
          ) : (
            <>
              {wsState.messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message input */}
        <div className="p-3 bg-panel border-t border-panel-border">
          <div className="flex gap-2">
            <textarea
              className="input flex-1 resize-none h-20 font-mono text-sm"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isConnected
                  ? 'Type a message... (Cmd+Enter to send)'
                  : 'Connect to send messages'
              }
              disabled={!isConnected}
            />
            <button
              className="btn btn-primary self-end px-6"
              onClick={handleSendMessage}
              disabled={!isConnected || !messageInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageItem({ message }: { message: WebSocketMessage }) {
  const [expanded, setExpanded] = useState(true)
  const isSent = message.direction === 'sent'
  const isSystem = message.type === 'system'

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleTimeString()
  }

  const formatPayload = (payload: string) => {
    try {
      const parsed = JSON.parse(payload)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return payload
    }
  }

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500">
        <span className="text-gray-600">{formatTimestamp(message.timestamp)}</span>
        <span>{message.payload}</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded border ${
        isSent
          ? 'border-blue-700 bg-blue-900/20'
          : 'border-green-700 bg-green-900/20'
      }`}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className={`text-xs font-semibold ${isSent ? 'text-blue-400' : 'text-green-400'}`}
        >
          {isSent ? 'SENT' : 'RECEIVED'}
        </span>
        <span className="text-xs text-gray-500">{message.type}</span>
        <span className="text-xs text-gray-600 ml-auto">
          {formatTimestamp(message.timestamp)}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {expanded && (
        <div className="px-3 py-2 border-t border-gray-700">
          <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-all">
            {formatPayload(message.payload)}
          </pre>
          <button
            className="mt-2 text-xs text-gray-400 hover:text-gray-200"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(message.payload)
            }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
