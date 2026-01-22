import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import VariableHighlightInput from '../common/VariableHighlightInput'
import HeadersEditor from '../request/HeadersEditor'
import AuthPanel from '../request/AuthPanel'
import type {
  Tab,
  SSERequest,
  SSEEvent,
  SSEConnectionStatus
} from '../../../shared/types/models'

type ConfigTab = 'headers' | 'auth'

interface SSEPanelProps {
  tab: Tab
}

export default function SSEPanel({ tab }: SSEPanelProps) {
  const { updateTab } = useAppStore()
  const { activeEnvironment } = useEnvironmentStore()
  const [configTab, setConfigTab] = useState<ConfigTab>('headers')
  const [isConnecting, setIsConnecting] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
  const eventsEndRef = useRef<HTMLDivElement>(null)

  const request = tab.request as SSERequest
  const sseState = tab.sseState || {
    status: 'disconnected' as SSEConnectionStatus,
    events: []
  }

  // Scroll to bottom when events change
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sseState.events])

  // Set up SSE event listeners
  useEffect(() => {
    const unsubEvent = window.api.sse.onEvent((connId, event) => {
      if (connId === tab.id) {
        updateTab(tab.id, {
          sseState: {
            ...sseState,
            events: [...sseState.events, event],
            lastEventId: event.eventId || sseState.lastEventId
          }
        })
      }
    })

    const unsubStatus = window.api.sse.onStatusChange((connId, status, error) => {
      if (connId === tab.id) {
        updateTab(tab.id, {
          sseState: {
            ...sseState,
            status,
            error,
            connectedAt: status === 'connected' ? new Date().toISOString() : sseState.connectedAt
          }
        })
        setIsConnecting(false)
      }
    })

    return () => {
      unsubEvent()
      unsubStatus()
    }
  }, [tab.id, sseState, updateTab])

  const handleUrlChange = (url: string) => {
    updateTab(tab.id, {
      request: { ...request, url },
      title: url || 'SSE',
      isDirty: true
    })
  }

  const handleConnect = async () => {
    if (sseState.status === 'connected') {
      await window.api.sse.disconnect(tab.id)
    } else {
      setIsConnecting(true)
      try {
        await window.api.sse.connect(tab.id, request, activeEnvironment || undefined)
      } catch (error) {
        setIsConnecting(false)
        updateTab(tab.id, {
          sseState: {
            ...sseState,
            status: 'error',
            error: (error as Error).message
          }
        })
      }
    }
  }

  const handleClearEvents = () => {
    updateTab(tab.id, {
      sseState: {
        ...sseState,
        events: []
      }
    })
  }

  const getStatusColor = (status: SSEConnectionStatus) => {
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

  const isConnected = sseState.status === 'connected'

  // Get unique event types for filtering
  const eventTypes = [...new Set(sseState.events.map((e) => e.eventType).filter((t) => t !== 'system'))]

  // Filter events
  const filteredEvents = filterType
    ? sseState.events.filter((e) => e.eventType === filterType || e.eventType === 'system')
    : sseState.events

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* URL Bar and Connect Button */}
      <div className="flex items-center gap-2 p-3 bg-panel border-b border-panel-border">
        <span className="text-amber-400 font-semibold text-sm px-2">SSE</span>
        <VariableHighlightInput
          value={request.url}
          onChange={handleUrlChange}
          placeholder="https://example.com/events"
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
          <span className={`w-2 h-2 rounded-full ${getStatusColor(sseState.status)}`} />
          <span className="text-sm text-gray-400 capitalize">{sseState.status}</span>
        </div>
        {sseState.connectedAt && isConnected && (
          <span className="text-xs text-gray-500">
            Connected since {new Date(sseState.connectedAt).toLocaleTimeString()}
          </span>
        )}
        {sseState.lastEventId && (
          <span className="text-xs text-gray-500">
            Last ID: {sseState.lastEventId}
          </span>
        )}
        {sseState.error && (
          <span className="text-xs text-red-400">{sseState.error}</span>
        )}
        <span className="ml-auto text-xs text-gray-500">
          {sseState.events.filter((e) => e.eventType !== 'system').length} events
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

      {/* Events Panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-editor">
        {/* Events header */}
        <div className="flex items-center justify-between px-4 py-2 bg-panel border-b border-panel-border">
          <span className="text-sm font-semibold text-gray-300">Events</span>
          <div className="flex items-center gap-3">
            {eventTypes.length > 0 && (
              <select
                className="input py-1 text-xs"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All types</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
            {sseState.events.length > 0 && (
              <button
                className="text-xs text-gray-400 hover:text-gray-200"
                onClick={handleClearEvents}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Events list */}
        <div className="flex-1 overflow-auto p-2 space-y-2">
          {filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {isConnected
                ? 'Waiting for events...'
                : 'Connect to start receiving events.'}
            </div>
          ) : (
            <>
              {filteredEvents.map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
              <div ref={eventsEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EventItem({ event }: { event: SSEEvent }) {
  const [expanded, setExpanded] = useState(true)
  const isSystem = event.eventType === 'system'

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleTimeString()
  }

  const formatData = (data: string) => {
    try {
      const parsed = JSON.parse(data)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return data
    }
  }

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500">
        <span className="text-gray-600">{formatTimestamp(event.timestamp)}</span>
        <span>{event.data}</span>
      </div>
    )
  }

  return (
    <div className="rounded border border-amber-700 bg-amber-900/20">
      <div
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-semibold text-amber-400">
          {event.eventType.toUpperCase()}
        </span>
        {event.eventId && (
          <span className="text-xs text-gray-500">id: {event.eventId}</span>
        )}
        <span className="text-xs text-gray-600 ml-auto">
          {formatTimestamp(event.timestamp)}
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
            {formatData(event.data)}
          </pre>
          <button
            className="mt-2 text-xs text-gray-400 hover:text-gray-200"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(event.data)
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
