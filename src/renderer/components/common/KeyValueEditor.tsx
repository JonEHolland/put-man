import { v4 as uuidv4 } from 'uuid'
import type { KeyValuePair } from '../../../shared/types/models'

interface KeyValueEditorProps {
  items: KeyValuePair[]
  onChange: (items: KeyValuePair[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export default function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value'
}: KeyValueEditorProps) {
  const handleAdd = () => {
    onChange([...items, { id: uuidv4(), key: '', value: '', enabled: true }])
  }

  const handleUpdate = (id: string, field: keyof KeyValuePair, value: string | boolean) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  return (
    <div className="p-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs uppercase">
            <th className="w-8 pb-2"></th>
            <th className="text-left pb-2 px-2">{keyPlaceholder}</th>
            <th className="text-left pb-2 px-2">{valuePlaceholder}</th>
            <th className="w-8 pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="group">
              <td className="py-1">
                <input
                  type="checkbox"
                  className="rounded bg-editor border-panel-border"
                  checked={item.enabled}
                  onChange={(e) => handleUpdate(item.id, 'enabled', e.target.checked)}
                />
              </td>
              <td className="py-1 px-2">
                <input
                  type="text"
                  className="input w-full py-1"
                  placeholder={keyPlaceholder}
                  value={item.key}
                  onChange={(e) => handleUpdate(item.id, 'key', e.target.value)}
                />
              </td>
              <td className="py-1 px-2">
                <input
                  type="text"
                  className="input w-full py-1"
                  placeholder={valuePlaceholder}
                  value={item.value}
                  onChange={(e) => handleUpdate(item.id, 'value', e.target.value)}
                />
              </td>
              <td className="py-1">
                <button
                  className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(item.id)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="btn btn-ghost text-xs mt-2" onClick={handleAdd}>
        + Add
      </button>
    </div>
  )
}
