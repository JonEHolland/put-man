import { useState, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'
import KeyValueEditor from '../common/KeyValueEditor'
import CodeEditor from '../common/CodeEditor'
import type { Tab, HttpRequest, BodyType, KeyValuePair } from '../../../shared/types/models'

const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'json', label: 'JSON' },
  { id: 'form-data', label: 'Form Data' },
  { id: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { id: 'raw', label: 'Raw' },
  { id: 'binary', label: 'Binary' }
]

interface BodyEditorProps {
  tab: Tab
}

export default function BodyEditor({ tab }: BodyEditorProps) {
  const { updateTab } = useAppStore()
  const request = tab.request as HttpRequest
  const [jsonValid, setJsonValid] = useState(true)
  const [jsonErrors, setJsonErrors] = useState<string[]>([])

  const bodyType = request.body?.type || 'none'

  const handleTypeChange = (type: BodyType) => {
    updateTab(tab.id, {
      request: {
        ...request,
        body: { ...request.body, type }
      },
      isDirty: true
    })
    // Reset validation state when switching types
    setJsonValid(true)
    setJsonErrors([])
  }

  const handleContentChange = (content: string) => {
    updateTab(tab.id, {
      request: {
        ...request,
        body: { ...request.body, content }
      },
      isDirty: true
    })
  }

  const handleFormDataChange = (formData: KeyValuePair[]) => {
    updateTab(tab.id, {
      request: {
        ...request,
        body: { ...request.body, formData }
      },
      isDirty: true
    })
  }

  const handleValidationChange = useCallback((isValid: boolean, errors: string[]) => {
    setJsonValid(isValid)
    setJsonErrors(errors)
  }, [])

  return (
    <div className="p-2 h-full flex flex-col">
      {/* Body type selector */}
      <div className="flex items-center gap-4 mb-3 pb-2 border-b border-panel-border">
        {BODY_TYPES.map((type) => (
          <label key={type.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="bodyType"
              className="text-accent"
              checked={bodyType === type.id}
              onChange={() => handleTypeChange(type.id)}
            />
            {type.label}
          </label>
        ))}
        {/* JSON validation indicator */}
        {bodyType === 'json' && request.body?.content && (
          <div className="ml-auto flex items-center gap-2">
            {jsonValid ? (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Valid JSON
              </span>
            ) : (
              <span className="text-xs text-red-400 flex items-center gap-1" title={jsonErrors.join('\n')}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Invalid JSON
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body content */}
      {bodyType === 'none' && (
        <div className="text-gray-500 text-sm">This request does not have a body</div>
      )}

      {bodyType === 'json' && (
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={request.body?.content || ''}
            onChange={handleContentChange}
            language="json"
            placeholder={'{\n  "key": "value"\n}'}
            onValidationChange={handleValidationChange}
            minHeight={200}
          />
        </div>
      )}

      {bodyType === 'raw' && (
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={request.body?.content || ''}
            onChange={handleContentChange}
            language="plaintext"
            placeholder="Raw content..."
            minHeight={200}
          />
        </div>
      )}

      {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
        <KeyValueEditor
          items={request.body?.formData || []}
          onChange={handleFormDataChange}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
        />
      )}

      {bodyType === 'binary' && (
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary">Select File</button>
          <span className="text-gray-500 text-sm">No file selected</span>
        </div>
      )}
    </div>
  )
}
