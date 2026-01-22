import { useState, useEffect } from 'react'
import { useCollectionStore } from '../../stores/collectionStore'
import type { Request, Collection, Folder } from '../../../shared/types/models'

interface SaveToCollectionModalProps {
  request: Request
  onClose: () => void
  onSaved: (collectionRequestId: string) => void
}

export default function SaveToCollectionModal({
  request,
  onClose,
  onSaved
}: SaveToCollectionModalProps) {
  const {
    collections,
    folders,
    loadCollections,
    loadFolders,
    saveRequest,
    createCollection
  } = useCollectionStore()

  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [requestName, setRequestName] = useState(request.name || '')
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  useEffect(() => {
    if (selectedCollection) {
      loadFolders(selectedCollection)
    }
  }, [selectedCollection, loadFolders])

  const collectionFolders = selectedCollection ? folders[selectedCollection] || [] : []

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return
    const collection = await createCollection(newCollectionName.trim())
    setSelectedCollection(collection.id)
    setNewCollectionName('')
    setIsCreatingCollection(false)
  }

  const handleSave = async () => {
    if (!selectedCollection) return

    setIsSaving(true)
    try {
      const requestToSave = {
        ...request,
        name: requestName || request.name || 'Untitled',
        updatedAt: new Date().toISOString()
      }

      const collectionRequest = await saveRequest(
        selectedCollection,
        requestToSave,
        selectedFolder || undefined
      )
      onSaved(collectionRequest.id)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  // Build folder tree for display
  const renderFolderOptions = (parentId?: string, depth = 0): JSX.Element[] => {
    const childFolders = collectionFolders.filter((f) =>
      parentId ? f.parentId === parentId : !f.parentId
    )

    return childFolders.flatMap((folder) => [
      <option key={folder.id} value={folder.id}>
        {'  '.repeat(depth)}
        {depth > 0 ? '└ ' : ''}
        {folder.name}
      </option>,
      ...renderFolderOptions(folder.id, depth + 1)
    ])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-panel border border-panel-border rounded-lg shadow-xl w-[400px] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <h2 className="text-lg font-semibold text-white">Save to Collection</h2>
          <button
            className="text-gray-400 hover:text-gray-200"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Request name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Request Name</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Enter request name"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Collection selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Collection</label>
            {isCreatingCollection ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Collection name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCollection()
                    if (e.key === 'Escape') setIsCreatingCollection(false)
                  }}
                  autoFocus
                />
                <button
                  className="btn btn-primary text-xs"
                  onClick={handleCreateCollection}
                >
                  Create
                </button>
                <button
                  className="btn btn-secondary text-xs"
                  onClick={() => setIsCreatingCollection(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  className="select flex-1"
                  value={selectedCollection}
                  onChange={(e) => {
                    setSelectedCollection(e.target.value)
                    setSelectedFolder('')
                  }}
                >
                  <option value="">Select a collection</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-secondary text-xs"
                  onClick={() => setIsCreatingCollection(true)}
                >
                  New
                </button>
              </div>
            )}
          </div>

          {/* Folder selector (optional) */}
          {selectedCollection && collectionFolders.length > 0 && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Folder <span className="text-gray-500">(optional)</span>
              </label>
              <select
                className="select w-full"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
              >
                <option value="">Root (no folder)</option>
                {renderFolderOptions()}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-panel-border">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!selectedCollection || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
