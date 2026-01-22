import { useState } from 'react'
import { useCollectionStore } from '../../stores/collectionStore'

interface ImportExportModalProps {
  mode: 'import' | 'export'
  onClose: () => void
}

export default function ImportExportModal({ mode, onClose }: ImportExportModalProps) {
  const { collections, loadCollections } = useCollectionStore()
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(collections[0]?.id || '')
  const [exportFormat, setExportFormat] = useState<'postman' | 'native'>('postman')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const file = await window.api.file.openFile([
        { name: 'Postman Collection', extensions: ['json'] }
      ])
      if (file) {
        await window.api.import.postmanCollection(file.path)
        await loadCollections()
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    if (!selectedCollectionId) {
      setError('Please select a collection to export')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const collection = collections.find(c => c.id === selectedCollectionId)
      const content = await window.api.export.collection(selectedCollectionId, exportFormat)
      const extension = exportFormat === 'postman' ? 'postman_collection.json' : 'json'
      await window.api.file.saveFile(content, `${collection?.name || 'collection'}.${extension}`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">
          {mode === 'import' ? 'Import Collection' : 'Export Collection'}
        </h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded p-3 mb-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        {mode === 'import' ? (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Import a Postman Collection v2.1 JSON file.
            </p>
            <button
              className="btn btn-primary w-full"
              onClick={handleImport}
              disabled={isLoading}
            >
              {isLoading ? 'Importing...' : 'Select File to Import'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Collection</label>
              <select
                className="select w-full"
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
              >
                {collections.length === 0 ? (
                  <option value="">No collections available</option>
                ) : (
                  collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Format</label>
              <select
                className="select w-full"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'postman' | 'native')}
              >
                <option value="postman">Postman Collection v2.1</option>
                <option value="native">Native JSON</option>
              </select>
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={handleExport}
              disabled={isLoading || collections.length === 0}
            >
              {isLoading ? 'Exporting...' : 'Export Collection'}
            </button>
          </div>
        )}

        <button
          className="mt-4 text-gray-400 hover:text-white text-sm w-full"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
