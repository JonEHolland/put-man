import KeyValueEditor from '../common/KeyValueEditor'
import { useAppStore } from '../../stores/appStore'
import type { Tab, HttpRequest, KeyValuePair } from '../../../shared/types/models'

interface ParamsEditorProps {
  tab: Tab
}

export default function ParamsEditor({ tab }: ParamsEditorProps) {
  const { updateTab } = useAppStore()
  const request = tab.request as HttpRequest

  const handleChange = (params: KeyValuePair[]) => {
    updateTab(tab.id, {
      request: { ...request, params },
      isDirty: true
    })
  }

  return (
    <KeyValueEditor
      items={request.params || []}
      onChange={handleChange}
      keyPlaceholder="Parameter"
      valuePlaceholder="Value"
    />
  )
}
