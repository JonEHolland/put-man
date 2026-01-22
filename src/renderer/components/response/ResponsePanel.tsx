import { useState, useMemo, useEffect } from 'react'
import type { Response, Request, HttpRequest, CodeLanguage, CodeLanguageOption } from '../../../shared/types/models'
import CodeEditor from '../common/CodeEditor'
import JsonTreeView from '../common/JsonTreeView'

type ResponseTab = 'body' | 'headers' | 'cookies' | 'tests' | 'code'

interface ResponsePanelProps {
  request: Request
  response?: Response
}

export default function ResponsePanel({ request, response }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body')

  if (!response) {
    return (
      <div className="flex-1 flex flex-col bg-editor overflow-hidden">
        {/* Code Generation tab available even without response */}
        <div className="flex border-b border-panel-border bg-sidebar">
          <button
            className={`tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            Code
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {activeTab === 'code' && request.type === 'http' ? (
            <CodeGeneration request={request as HttpRequest} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ResponseIcon />
                <p className="mt-2">Send a request to see the response</p>
                <p className="text-sm mt-1 text-gray-600">
                  or use the Code tab to generate code snippets
                </p>
              </div>
            </div>
          )}
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
        <button
          className={`tab ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
        >
          Tests
          <TestResultsBadge response={response} />
        </button>
        <button
          className={`tab ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'body' && <ResponseBody body={response.body} />}
        {activeTab === 'headers' && <ResponseHeaders headers={response.headers} />}
        {activeTab === 'cookies' && <ResponseCookies headers={response.headers} />}
        {activeTab === 'tests' && <TestResults response={response} />}
        {activeTab === 'code' && request.type === 'http' && (
          <CodeGeneration request={request as HttpRequest} />
        )}
      </div>
    </div>
  )
}

function ResponseBody({ body }: { body: string }) {
  const [viewMode, setViewMode] = useState<'pretty' | 'raw' | 'tree'>('pretty')

  const { displayBody, isJson, parsedJson, detectedLanguage } = useMemo(() => {
    // Try to detect content type and format
    const trimmed = body.trim()

    // Check for JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(body)
        return {
          displayBody: JSON.stringify(parsed, null, 2),
          isJson: true,
          parsedJson: parsed,
          detectedLanguage: 'json' as const
        }
      } catch {
        // Not valid JSON
      }
    }

    // Check for XML/HTML
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      return {
        displayBody: body,
        isJson: false,
        parsedJson: null,
        detectedLanguage: trimmed.startsWith('<?xml') ? 'xml' as const : 'html' as const
      }
    }

    // Default to plaintext
    return {
      displayBody: body,
      isJson: false,
      parsedJson: null,
      detectedLanguage: 'plaintext' as const
    }
  }, [body])

  const languageLabel = isJson ? 'JSON' : detectedLanguage === 'xml' ? 'XML' : detectedLanguage === 'html' ? 'HTML' : 'Text'

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
        {isJson && (
          <button
            className={`text-xs px-2 py-1 rounded ${
              viewMode === 'tree' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setViewMode('tree')}
          >
            Tree
          </button>
        )}
        <button
          className={`text-xs px-2 py-1 rounded ${
            viewMode === 'raw' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setViewMode('raw')}
        >
          Raw
        </button>
        <span className="ml-2 text-xs text-gray-500">{languageLabel}</span>
        <button
          className="ml-auto text-xs text-gray-400 hover:text-gray-200"
          onClick={() => navigator.clipboard.writeText(body)}
        >
          Copy
        </button>
      </div>

      {/* Body content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {viewMode === 'tree' && isJson && parsedJson !== null ? (
          <JsonTreeView data={parsedJson} />
        ) : viewMode === 'pretty' ? (
          <CodeEditor
            value={displayBody}
            language={detectedLanguage}
            readOnly
          />
        ) : (
          <CodeEditor
            value={body}
            language="plaintext"
            readOnly
          />
        )}
      </div>
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

function CodeGeneration({ request }: { request: HttpRequest }) {
  const [languages, setLanguages] = useState<CodeLanguageOption[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('curl')
  const [generatedCode, setGeneratedCode] = useState('')
  const [includeComments, setIncludeComments] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load supported languages on mount
  useEffect(() => {
    window.api.codeGen.getSupportedLanguages().then(setLanguages)
  }, [])

  // Generate code when request or language changes
  useEffect(() => {
    const generateCode = async () => {
      setIsLoading(true)
      try {
        const code = await window.api.codeGen.generate(selectedLanguage, request, includeComments)
        setGeneratedCode(code)
      } catch (error) {
        console.error('Code generation failed:', error)
        setGeneratedCode('// Error generating code')
      } finally {
        setIsLoading(false)
      }
    }

    generateCode()
  }, [request, selectedLanguage, includeComments])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getEditorLanguage = (lang: CodeLanguage): string => {
    switch (lang) {
      case 'curl':
        return 'shell'
      case 'javascript-fetch':
      case 'javascript-axios':
        return 'javascript'
      case 'python-requests':
        return 'python'
      case 'go':
        return 'go'
      case 'php-curl':
        return 'php'
      default:
        return 'plaintext'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-2 bg-panel border-b border-panel-border">
        <label className="text-sm text-gray-400">Language:</label>
        <select
          className="select text-sm"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value as CodeLanguage)}
        >
          {languages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-sm text-gray-400 ml-4">
          <input
            type="checkbox"
            checked={includeComments}
            onChange={(e) => setIncludeComments(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          Include comments
        </label>

        <button
          className="ml-auto text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <CheckIcon />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Generated code */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Generating code...
          </div>
        ) : (
          <CodeEditor
            value={generatedCode}
            language={getEditorLanguage(selectedLanguage)}
            readOnly
          />
        )}
      </div>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function TestResultsBadge({ response }: { response: Response }) {
  const testResult = response.testScriptResult
  if (!testResult || testResult.testResults.length === 0) {
    return null
  }

  const passed = testResult.testResults.filter(t => t.passed).length
  const total = testResult.testResults.length
  const allPassed = passed === total

  return (
    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
      allPassed ? 'bg-green-600' : 'bg-red-600'
    }`}>
      {passed}/{total}
    </span>
  )
}

function TestResults({ response }: { response: Response }) {
  const preRequestResult = response.preRequestScriptResult
  const testResult = response.testScriptResult

  const hasPreRequestLogs = preRequestResult && preRequestResult.consoleLogs.length > 0
  const hasTestLogs = testResult && testResult.consoleLogs.length > 0
  const hasTests = testResult && testResult.testResults.length > 0
  const hasAnyContent = hasPreRequestLogs || hasTestLogs || hasTests || preRequestResult?.error || testResult?.error

  if (!hasAnyContent) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        <p>No test results</p>
        <p className="mt-2 text-gray-600">
          Add tests to your request in the Scripts tab to see results here.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Pre-request script results */}
      {(preRequestResult?.consoleLogs?.length > 0 || preRequestResult?.error) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            Pre-request Script
            {preRequestResult.error ? (
              <span className="text-xs text-red-400">Failed</span>
            ) : (
              <span className="text-xs text-green-400">Completed in {preRequestResult.duration}ms</span>
            )}
          </h3>
          {preRequestResult.error && (
            <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2 mb-2">
              <p className="text-red-400 text-sm font-mono">{preRequestResult.error}</p>
            </div>
          )}
          {preRequestResult.consoleLogs.length > 0 && (
            <ConsoleOutput logs={preRequestResult.consoleLogs} />
          )}
        </div>
      )}

      {/* Test results */}
      {hasTests && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            Test Results
            {testResult && (
              <span className="text-xs text-gray-500">
                {testResult.testResults.filter(t => t.passed).length}/{testResult.testResults.length} passed
                ({testResult.duration}ms)
              </span>
            )}
          </h3>
          <div className="space-y-1">
            {testResult?.testResults.map((test, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 px-3 py-2 rounded ${
                  test.passed ? 'bg-green-900/20' : 'bg-red-900/20'
                }`}
              >
                {test.passed ? (
                  <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${test.passed ? 'text-green-300' : 'text-red-300'}`}>
                    {test.name}
                  </p>
                  {test.error && (
                    <p className="text-xs text-red-400 mt-1 font-mono">{test.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test script error */}
      {testResult?.error && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            Test Script Error
          </h3>
          <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2">
            <p className="text-red-400 text-sm font-mono">{testResult.error}</p>
          </div>
        </div>
      )}

      {/* Test script console output */}
      {hasTestLogs && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Test Script Console</h3>
          <ConsoleOutput logs={testResult!.consoleLogs} />
        </div>
      )}
    </div>
  )
}

function ConsoleOutput({ logs }: { logs: string[] }) {
  return (
    <div className="bg-black/30 border border-gray-700 rounded font-mono text-sm overflow-auto max-h-48">
      {logs.map((log, index) => (
        <div
          key={index}
          className={`px-3 py-1 border-b border-gray-800 last:border-0 ${
            log.startsWith('[ERROR]')
              ? 'text-red-400'
              : log.startsWith('[WARN]')
              ? 'text-yellow-400'
              : log.startsWith('[INFO]')
              ? 'text-blue-400'
              : log.startsWith('[DEBUG]')
              ? 'text-gray-500'
              : 'text-gray-300'
          }`}
        >
          {log}
        </div>
      ))}
    </div>
  )
}
