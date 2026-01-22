import { KeyboardEvent } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import VariableHighlightInput from '../common/VariableHighlightInput'
import SaveToCollectionModal from '../common/SaveToCollectionModal'
import type { Tab, HttpMethod, HttpRequest } from '../../../shared/types/models'
import { useState } from 'react'

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

interface UrlBarProps {
  tab: Tab
}

export default function UrlBar({ tab }: UrlBarProps) {
  const { updateTab, sendRequest, cancelRequest } = useAppStore()
  const { activeEnvironment } = useEnvironmentStore()
  const [showSaveModal, setShowSaveModal] = useState(false)

  const request = tab.request as HttpRequest
  const isLoading = tab.isLoading

  const handleMethodChange = (method: HttpMethod) => {
    updateTab(tab.id, {
      request: { ...request, method }
    })
  }

  const handleUrlChange = (url: string) => {
    updateTab(tab.id, {
      request: { ...request, url },
      title: url || 'Untitled',
      isDirty: true
    })
  }

  const handleSend = async () => {
    await sendRequest(tab.id, activeEnvironment)
  }

  const handleCancel = () => {
    cancelRequest(tab.id)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend()
    }
  }

  const methodClass = `method-${request.method.toLowerCase()}`

  return (
    <div className="flex items-center gap-2 p-3 bg-panel">
      {/* Method selector */}
      <select
        className={`select font-semibold ${methodClass} bg-transparent border-none pr-8`}
        value={request.method}
        onChange={(e) => handleMethodChange(e.target.value as HttpMethod)}
        disabled={isLoading}
      >
        {HTTP_METHODS.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>

      {/* URL input with variable highlighting */}
      <VariableHighlightInput
        value={request.url}
        onChange={handleUrlChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter URL or paste cURL"
        className="input flex-1"
        disabled={isLoading}
      />

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
        <button
          className="btn btn-primary px-6"
          onClick={handleSend}
        >
          Send
        </button>
      )}

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
