import { useState, KeyboardEvent } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import VariableHighlightInput from '../common/VariableHighlightInput'
import HeadersEditor from '../request/HeadersEditor'
import AuthPanel from '../request/AuthPanel'
import ScriptsPanel from '../request/ScriptsPanel'
import CodeEditor from '../common/CodeEditor'
import SaveToCollectionModal from '../common/SaveToCollectionModal'
import type { Tab, GraphQLRequest } from '../../../shared/types/models'

type ConfigTab = 'headers' | 'auth' | 'scripts'

interface GraphQLPanelProps {
  tab: Tab
}

export default function GraphQLPanel({ tab }: GraphQLPanelProps) {
  const { updateTab, sendGraphQLRequest, cancelGraphQLRequest } = useAppStore()
  const { activeEnvironment } = useEnvironmentStore()
  const [configTab, setConfigTab] = useState<ConfigTab>('headers')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [schemaLoading, setSchemaLoading] = useState(false)

  const request = tab.request as GraphQLRequest
  const isLoading = tab.isLoading
  const hasScripts = !!(request.preRequestScript?.trim() || request.testScript?.trim())

  const handleUrlChange = (url: string) => {
    updateTab(tab.id, {
      request: { ...request, url },
      title: url || 'GraphQL',
      isDirty: true
    })
  }

  const handleQueryChange = (query: string) => {
    updateTab(tab.id, {
      request: { ...request, query },
      isDirty: true
    })
  }

  const handleVariablesChange = (variables: string) => {
    updateTab(tab.id, {
      request: { ...request, variables },
      isDirty: true
    })
  }

  const handleSend = async () => {
    await sendGraphQLRequest(tab.id, activeEnvironment)
  }

  const handleCancel = () => {
    cancelGraphQLRequest(tab.id)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend()
    }
  }

  const handleFetchSchema = async () => {
    if (!request.url) return

    setSchemaLoading(true)
    try {
      const schema = await window.api.graphql.introspect(
        request.url,
        request.headers,
        activeEnvironment || undefined
      )
      console.log('Schema loaded:', schema)
    } catch {
      console.error('Failed to fetch schema')
    } finally {
      setSchemaLoading(false)
    }
  }

  const configTabItems: { id: ConfigTab; label: string; badge?: number; dot?: boolean }[] = [
    { id: 'headers', label: 'Headers', badge: request.headers?.filter((h) => h.enabled).length },
    { id: 'auth', label: 'Auth' },
    { id: 'scripts', label: 'Scripts', dot: hasScripts }
  ]

  return (
    <div className="flex flex-col border-b border-panel-border">
      {/* URL Bar */}
      <div className="flex items-center gap-2 p-3 bg-panel">
        <span className="text-pink-400 font-semibold text-sm px-2">GQL</span>
        <VariableHighlightInput
          value={request.url}
          onChange={handleUrlChange}
          onKeyDown={handleKeyDown}
          placeholder="https://api.example.com/graphql"
          className="input flex-1"
          disabled={isLoading}
        />

        {/* Fetch Schema button */}
        <button
          className="btn btn-secondary px-3"
          onClick={handleFetchSchema}
          disabled={schemaLoading || !request.url}
          title="Fetch Schema (Introspection)"
        >
          {schemaLoading ? <LoadingSpinner /> : <SchemaIcon />}
        </button>

        {/* Save button */}
        <button
          className="btn btn-secondary px-4"
          onClick={() => setShowSaveModal(true)}
          title="Save to Collection"
          disabled={isLoading}
        >
          <SaveIcon />
        </button>

        {/* Send/Cancel button */}
        {isLoading ? (
          <button
            className="btn bg-red-600 hover:bg-red-700 text-white px-6"
            onClick={handleCancel}
          >
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Cancel
            </span>
          </button>
        ) : (
          <button className="btn btn-primary px-6" onClick={handleSend}>
            Send
          </button>
        )}
      </div>

      {/* Config tabs */}
      <div className="flex border-b border-panel-border bg-sidebar">
        {configTabItems.map((item) => (
          <button
            key={item.id}
            className={`tab ${configTab === item.id ? 'active' : ''}`}
            onClick={() => setConfigTab(item.id)}
          >
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-600 rounded-full">
                {item.badge}
              </span>
            )}
            {item.dot && (
              <span className="ml-1.5 w-2 h-2 inline-block rounded-full bg-orange-500" />
            )}
          </button>
        ))}
      </div>

      {/* Config content */}
      <div className="h-24 overflow-auto bg-panel border-b border-panel-border">
        {configTab === 'headers' && <HeadersEditor tab={tab} />}
        {configTab === 'auth' && <AuthPanel tab={tab} />}
        {configTab === 'scripts' && <ScriptsPanel tab={tab} />}
      </div>

      {/* Query and Variables editors */}
      <div className="flex flex-1 min-h-0">
        {/* Query Editor */}
        <div className="flex-1 flex flex-col border-r border-panel-border">
          <div className="px-3 py-2 bg-sidebar border-b border-panel-border">
            <span className="text-sm font-semibold text-gray-300">Query</span>
          </div>
          <div className="flex-1 min-h-[200px]">
            <CodeEditor
              value={request.query}
              onChange={handleQueryChange}
              language="plaintext"
              placeholder="query { ... }"
              height="100%"
            />
          </div>
        </div>

        {/* Variables Editor */}
        <div className="w-80 flex flex-col">
          <div className="px-3 py-2 bg-sidebar border-b border-panel-border">
            <span className="text-sm font-semibold text-gray-300">Variables</span>
          </div>
          <div className="flex-1 min-h-[200px]">
            <CodeEditor
              value={request.variables}
              onChange={handleVariablesChange}
              language="json"
              placeholder="{}"
              height="100%"
            />
          </div>
        </div>
      </div>

      {/* Save to Collection Modal */}
      {showSaveModal && (
        <SaveToCollectionModal
          request={request}
          onClose={() => setShowSaveModal(false)}
          onSaved={(collectionRequestId) => {
            updateTab(tab.id, {
              collectionRequestId,
              isDirty: false
            })
          }}
        />
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

function SaveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  )
}

function SchemaIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      />
    </svg>
  )
}
