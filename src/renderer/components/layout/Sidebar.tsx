import { useState } from 'react'
import { useCollectionStore } from '../../stores/collectionStore'
import { useHistoryStore } from '../../stores/historyStore'
import { useAppStore } from '../../stores/appStore'
import type { Collection, HistoryEntry, HttpMethod } from '../../../shared/types/models'

type SidebarTab = 'collections' | 'history'

export default function Sidebar() {
  const [activeSection, setActiveSection] = useState<SidebarTab>('collections')
  const [isCreating, setIsCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  const { collections, createCollection } = useCollectionStore()
  const { history, loadHistory } = useHistoryStore()
  const { createNewTab } = useAppStore()

  const handleCreateCollection = async () => {
    if (newCollectionName.trim()) {
      await createCollection(newCollectionName.trim())
      setNewCollectionName('')
      setIsCreating(false)
    }
  }

  const handleLoadHistory = () => {
    setActiveSection('history')
    loadHistory()
  }

  return (
    <div className="w-64 bg-sidebar flex flex-col border-r border-panel-border">
      {/* Header */}
      <div className="h-12 flex items-center px-4 border-b border-panel-border drag-region">
        <span className="font-semibold text-white">Put-Man</span>
      </div>

      {/* New Request Button */}
      <div className="p-2 border-b border-panel-border">
        <button
          className="w-full btn btn-primary flex items-center justify-center gap-2"
          onClick={createNewTab}
        >
          <PlusIcon />
          New Request
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-panel-border">
        <button
          className={`flex-1 py-2 text-sm ${
            activeSection === 'collections'
              ? 'text-white border-b-2 border-accent'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveSection('collections')}
        >
          Collections
        </button>
        <button
          className={`flex-1 py-2 text-sm ${
            activeSection === 'history'
              ? 'text-white border-b-2 border-accent'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={handleLoadHistory}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'collections' ? (
          <CollectionsList
            collections={collections}
            isCreating={isCreating}
            setIsCreating={setIsCreating}
            newCollectionName={newCollectionName}
            setNewCollectionName={setNewCollectionName}
            onCreateCollection={handleCreateCollection}
          />
        ) : (
          <HistoryList history={history} />
        )}
      </div>
    </div>
  )
}

interface CollectionsListProps {
  collections: Collection[]
  isCreating: boolean
  setIsCreating: (value: boolean) => void
  newCollectionName: string
  setNewCollectionName: (value: string) => void
  onCreateCollection: () => void
}

function CollectionsList({
  collections,
  isCreating,
  setIsCreating,
  newCollectionName,
  setNewCollectionName,
  onCreateCollection
}: CollectionsListProps) {
  return (
    <div className="p-2">
      {/* Add collection button */}
      {!isCreating && (
        <button
          className="sidebar-item w-full text-gray-400 hover:text-gray-200"
          onClick={() => setIsCreating(true)}
        >
          <PlusIcon />
          Add Collection
        </button>
      )}

      {/* New collection input */}
      {isCreating && (
        <div className="mb-2">
          <input
            type="text"
            className="input w-full mb-1"
            placeholder="Collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCreateCollection()
              if (e.key === 'Escape') setIsCreating(false)
            }}
            autoFocus
          />
          <div className="flex gap-1">
            <button className="btn btn-primary flex-1 text-xs" onClick={onCreateCollection}>
              Create
            </button>
            <button
              className="btn btn-secondary flex-1 text-xs"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collections list */}
      {collections.map((collection) => (
        <CollectionItem key={collection.id} collection={collection} />
      ))}

      {collections.length === 0 && !isCreating && (
        <div className="text-center text-gray-500 text-sm py-4">No collections yet</div>
      )}
    </div>
  )
}

interface CollectionItemProps {
  collection: Collection
}

function CollectionItem({ collection }: CollectionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <button
        className="sidebar-item w-full"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronIcon expanded={isExpanded} />
        <FolderIcon />
        <span className="truncate">{collection.name}</span>
      </button>

      {isExpanded && (
        <div className="ml-4 border-l border-panel-border">
          <div className="text-gray-500 text-xs py-2 px-3">No requests yet</div>
        </div>
      )}
    </div>
  )
}

interface HistoryListProps {
  history: HistoryEntry[]
}

function HistoryList({ history }: HistoryListProps) {
  const { openRequestInNewTab } = useAppStore()

  if (history.length === 0) {
    return <div className="text-center text-gray-500 text-sm py-4">No history yet</div>
  }

  return (
    <div className="p-2">
      {history.map((entry) => (
        <button
          key={entry.id}
          className="sidebar-item w-full"
          onClick={() => openRequestInNewTab(entry.request)}
        >
          {entry.request.type === 'http' && (
            <MethodBadge method={(entry.request as any).method} />
          )}
          <span className="truncate text-xs">
            {entry.request.type === 'http'
              ? (entry.request as any).url
              : entry.request.name}
          </span>
        </button>
      ))}
    </div>
  )
}

function MethodBadge({ method }: { method: HttpMethod }) {
  const methodClass = `method-${method.toLowerCase()}`
  return <span className={`method-badge ${methodClass}`}>{method}</span>
}

// Icons
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
