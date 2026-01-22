import { useState } from 'react'
import CodeEditor from '../common/CodeEditor'
import { useAppStore } from '../../stores/appStore'
import type { Tab, HttpRequest } from '../../../shared/types/models'

type ScriptTab = 'pre-request' | 'tests'

interface ScriptsPanelProps {
  tab: Tab
}

const PRE_REQUEST_PLACEHOLDER = `// Pre-request Script
// Runs before the request is sent
//
// Available APIs:
// - pm.environment.get(key)     Get environment variable
// - pm.environment.set(key, val) Set environment variable
// - pm.request.url              Current request URL
// - pm.request.method           HTTP method
// - pm.request.headers          Request headers
// - console.log(...)            Log to console
//
// Example:
// pm.environment.set('timestamp', Date.now().toString())
`

const TESTS_PLACEHOLDER = `// Test Script
// Runs after the response is received
//
// Available APIs:
// - pm.response.status          HTTP status code
// - pm.response.statusText      Status text
// - pm.response.headers         Response headers
// - pm.response.body            Response body as string
// - pm.response.json()          Parse response as JSON
// - pm.response.time            Response time in ms
// - pm.test(name, fn)           Define a test
// - pm.expect(value)            Assertion (chai-like)
//
// Example:
// pm.test('Status is 200', () => {
//   pm.expect(pm.response.status).to.equal(200)
// })
//
// pm.test('Response has data', () => {
//   const json = pm.response.json()
//   pm.expect(json).to.have.property('data')
// })
`

export default function ScriptsPanel({ tab }: ScriptsPanelProps) {
  const [activeTab, setActiveTab] = useState<ScriptTab>('pre-request')
  const updateRequest = useAppStore((state) => state.updateRequest)
  const request = tab.request as HttpRequest

  const handlePreRequestScriptChange = (value: string) => {
    updateRequest(tab.id, { preRequestScript: value })
  }

  const handleTestScriptChange = (value: string) => {
    updateRequest(tab.id, { testScript: value })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Script type tabs */}
      <div className="flex border-b border-panel-border bg-sidebar shrink-0">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'pre-request'
              ? 'text-orange-500 border-b-2 border-orange-500 bg-panel'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('pre-request')}
        >
          Pre-request
          {request.preRequestScript?.trim() && (
            <span className="ml-1.5 w-2 h-2 inline-block rounded-full bg-orange-500" />
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'tests'
              ? 'text-orange-500 border-b-2 border-orange-500 bg-panel'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('tests')}
        >
          Tests
          {request.testScript?.trim() && (
            <span className="ml-1.5 w-2 h-2 inline-block rounded-full bg-orange-500" />
          )}
        </button>
      </div>

      {/* Script editor */}
      <div className="flex-1 min-h-0">
        {activeTab === 'pre-request' && (
          <CodeEditor
            value={request.preRequestScript || ''}
            onChange={handlePreRequestScriptChange}
            language="javascript"
            height="100%"
            placeholder={PRE_REQUEST_PLACEHOLDER}
          />
        )}
        {activeTab === 'tests' && (
          <CodeEditor
            value={request.testScript || ''}
            onChange={handleTestScriptChange}
            language="javascript"
            height="100%"
            placeholder={TESTS_PLACEHOLDER}
          />
        )}
      </div>
    </div>
  )
}
