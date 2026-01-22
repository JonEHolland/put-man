import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import type { Tab, HttpMethod, HttpRequest } from '../../../shared/types/models'

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

interface UrlBarProps {
  tab: Tab
}

export default function UrlBar({ tab }: UrlBarProps) {
  const { updateTab, sendRequest } = useAppStore()
  const { activeEnvironment } = useEnvironmentStore()
  const [isSending, setIsSending] = useState(false)

  const request = tab.request as HttpRequest

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
    setIsSending(true)
    try {
      await sendRequest(tab.id, activeEnvironment)
    } finally {
      setIsSending(false)
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
      >
        {HTTP_METHODS.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>

      {/* URL input */}
      <input
        type="text"
        className="input flex-1"
        placeholder="Enter URL or paste cURL"
        value={request.url}
        onChange={(e) => handleUrlChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isSending) {
            handleSend()
          }
        }}
      />

      {/* Send button */}
      <button
        className="btn btn-primary px-6"
        onClick={handleSend}
        disabled={isSending}
      >
        {isSending ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner />
            Sending...
          </span>
        ) : (
          'Send'
        )}
      </button>
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
