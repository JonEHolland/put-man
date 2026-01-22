import KeyValueEditor from '../common/KeyValueEditor'
import { useAppStore } from '../../stores/appStore'
import type { Tab, HttpRequest, KeyValuePair } from '../../../shared/types/models'

interface HeadersEditorProps {
  tab: Tab
}

export default function HeadersEditor({ tab }: HeadersEditorProps) {
  const { updateTab } = useAppStore()
  const request = tab.request as HttpRequest

  const handleChange = (headers: KeyValuePair[]) => {
    updateTab(tab.id, {
      request: { ...request, headers },
      isDirty: true
    })
  }

  return (
    <KeyValueEditor
      items={request.headers || []}
      onChange={handleChange}
      keyPlaceholder="Header"
      valuePlaceholder="Value"
    />
  )
}
