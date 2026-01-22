import { useAppStore } from '../../stores/appStore'
import KeyValueEditor from '../common/KeyValueEditor'
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

  const bodyType = request.body?.type || 'none'

  const handleTypeChange = (type: BodyType) => {
    updateTab(tab.id, {
      request: {
        ...request,
        body: { ...request.body, type }
      },
      isDirty: true
    })
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

  return (
    <div className="p-2">
      {/* Body type selector */}
      <div className="flex gap-4 mb-3 pb-2 border-b border-panel-border">
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
      </div>

      {/* Body content */}
      {bodyType === 'none' && (
        <div className="text-gray-500 text-sm">This request does not have a body</div>
      )}

      {(bodyType === 'json' || bodyType === 'raw') && (
        <textarea
          className="input w-full h-32 font-mono text-sm resize-none"
          placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Raw content...'}
          value={request.body?.content || ''}
          onChange={(e) => handleContentChange(e.target.value)}
        />
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
