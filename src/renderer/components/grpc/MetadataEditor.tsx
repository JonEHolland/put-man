import KeyValueEditor from '../common/KeyValueEditor'
import { useAppStore } from '../../stores/appStore'
import type { Tab, GrpcRequest, KeyValuePair } from '../../../shared/types/models'

interface MetadataEditorProps {
  tab: Tab
}

export default function MetadataEditor({ tab }: MetadataEditorProps) {
  const { updateTab } = useAppStore()
  const request = tab.request as GrpcRequest

  const handleChange = (metadata: KeyValuePair[]) => {
    updateTab(tab.id, {
      request: { ...request, metadata },
      isDirty: true
    })
  }

  return (
    <KeyValueEditor
      items={request.metadata || []}
      onChange={handleChange}
      keyPlaceholder="Metadata Key"
      valuePlaceholder="Value"
    />
  )
}
