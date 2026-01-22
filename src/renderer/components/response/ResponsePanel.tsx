import { useState } from 'react'
import type { Response } from '../../../shared/types/models'

type ResponseTab = 'body' | 'headers' | 'cookies'

interface ResponsePanelProps {
  response?: Response
}

export default function ResponsePanel({ response }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body')

  if (!response) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor text-gray-500">
        <div className="text-center">
          <ResponseIcon />
          <p className="mt-2">Send a request to see the response</p>
        </div>
      </div>
    )
  }

  const statusClass = getStatusClass(response.status)
  const formattedSize = formatBytes(response.size)

  return (
    <div className="flex-1 flex flex-col bg-editor overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-panel border-b border-panel-border">
        <span className={`font-semibold ${statusClass}`}>
          {response.status} {response.statusText}
        </span>
        <span className="text-gray-400 text-sm">{response.time}ms</span>
        <span className="text-gray-400 text-sm">{formattedSize}</span>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-panel-border bg-sidebar">
        <button
          className={`tab ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Body
        </button>
        <button
          className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-600 rounded-full">
            {Object.keys(response.headers).length}
          </span>
        </button>
        <button
          className={`tab ${activeTab === 'cookies' ? 'active' : ''}`}
          onClick={() => setActiveTab('cookies')}
        >
          Cookies
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'body' && <ResponseBody body={response.body} />}
        {activeTab === 'headers' && <ResponseHeaders headers={response.headers} />}
        {activeTab === 'cookies' && <ResponseCookies headers={response.headers} />}
      </div>
    </div>
  )
}

function ResponseBody({ body }: { body: string }) {
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty')

  let displayBody = body
  let isJson = false

  try {
    const parsed = JSON.parse(body)
    displayBody = JSON.stringify(parsed, null, 2)
    isJson = true
  } catch {
    // Not JSON, show as-is
  }

  return (
    <div className="h-full flex flex-col">
      {/* View mode toggle */}
      <div className="flex items-center gap-2 px-4 py-2 bg-panel border-b border-panel-border">
        <button
          className={`text-xs px-2 py-1 rounded ${
            viewMode === 'pretty' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setViewMode('pretty')}
        >
          Pretty
        </button>
        <button
          className={`text-xs px-2 py-1 rounded ${
            viewMode === 'raw' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setViewMode('raw')}
        >
          Raw
        </button>
        {isJson && (
          <span className="ml-2 text-xs text-gray-500">JSON</span>
        )}
        <button
          className="ml-auto text-xs text-gray-400 hover:text-gray-200"
          onClick={() => navigator.clipboard.writeText(body)}
        >
          Copy
        </button>
      </div>

      {/* Body content */}
      <pre className="flex-1 p-4 overflow-auto font-mono text-sm text-gray-300 whitespace-pre-wrap">
        {viewMode === 'pretty' ? displayBody : body}
      </pre>
    </div>
  )
}

function ResponseHeaders({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers)

  return (
    <div className="p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs uppercase">
            <th className="text-left pb-2">Header</th>
            <th className="text-left pb-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-t border-panel-border">
              <td className="py-2 pr-4 text-gray-300 font-medium">{key}</td>
              <td className="py-2 text-gray-400 break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResponseCookies({ headers }: { headers: Record<string, string> }) {
  const setCookie = headers['set-cookie'] || headers['Set-Cookie']

  if (!setCookie) {
    return (
      <div className="p-4 text-gray-500 text-sm">No cookies in the response</div>
    )
  }

  return (
    <div className="p-4">
      <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">{setCookie}</pre>
    </div>
  )
}

function ResponseIcon() {
  return (
    <svg
      className="w-12 h-12 mx-auto text-gray-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return 'status-success'
  if (status >= 300 && status < 400) return 'status-redirect'
  if (status >= 400 && status < 500) return 'status-client-error'
  return 'status-server-error'
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
