import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import { useRef, useCallback, useState } from 'react'
import type { editor } from 'monaco-editor'

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: 'json' | 'xml' | 'html' | 'plaintext' | 'javascript'
  readOnly?: boolean
  height?: string | number
  minHeight?: number
  placeholder?: string
  onValidationChange?: (isValid: boolean, errors: string[]) => void
}

export default function CodeEditor({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  height = '100%',
  minHeight = 100,
  placeholder,
  onValidationChange
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    setIsLoading(false)

    // Configure JSON validation
    if (language === 'json') {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemas: [],
        enableSchemaRequest: false
      })
    }

    // Listen for validation changes
    if (onValidationChange) {
      const model = editor.getModel()
      if (model) {
        monaco.editor.onDidChangeMarkers((uris) => {
          const modelUri = model.uri.toString()
          const hasChanges = uris.some(uri => uri.toString() === modelUri)
          if (hasChanges) {
            const markers = monaco.editor.getModelMarkers({ resource: model.uri })
            const errors = markers
              .filter(m => m.severity === monaco.MarkerSeverity.Error)
              .map(m => `Line ${m.startLineNumber}: ${m.message}`)
            onValidationChange(errors.length === 0, errors)
          }
        })
      }
    }
  }, [language, onValidationChange])

  const handleChange: OnChange = useCallback((newValue) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue)
    }
  }, [onChange])

  return (
    <div
      className="relative"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: `${minHeight}px`
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-editor text-gray-500 text-sm">
          Loading editor...
        </div>
      )}
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineNumbers: readOnly ? 'off' : 'on',
          folding: true,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: 'selection',
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
          },
          padding: { top: 8, bottom: 8 },
          lineDecorationsWidth: 8,
          glyphMargin: false,
          contextmenu: true,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnEnter: 'off',
          tabCompletion: 'off',
          wordBasedSuggestions: 'off',
          parameterHints: { enabled: false },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          renderLineHighlight: readOnly ? 'none' : 'line',
          selectionHighlight: !readOnly,
          occurrencesHighlight: 'off'
        }}
        loading={null}
      />
      {placeholder && !value && (
        <div className="absolute top-2 left-4 text-gray-500 text-sm pointer-events-none font-mono">
          {placeholder}
        </div>
      )}
    </div>
  )
}
