import { useState, useEffect, useRef } from 'react'
import { useCollectionStore } from '../../stores/collectionStore'
import { useHistoryStore } from '../../stores/historyStore'
import { useAppStore } from '../../stores/appStore'
import ContextMenu, { ContextMenuItem } from '../common/ContextMenu'
import type {
  Collection,
  Folder,
  CollectionRequest,
  HistoryEntry,
  HttpMethod,
  HttpRequest
} from '../../../shared/types/models'

type SidebarTab = 'collections' | 'history'

interface ContextMenuState {
  x: number
  y: number
  type: 'collection' | 'folder' | 'request'
  data: Collection | Folder | CollectionRequest
  collectionId?: string
}

export default function Sidebar() {
  const [activeSection, setActiveSection] = useState<SidebarTab>('collections')
  const [isCreating, setIsCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [showNewRequestMenu, setShowNewRequestMenu] = useState(false)
  const newRequestMenuRef = useRef<HTMLDivElement>(null)

  const {
    collections,
    folders,
    requests,
    expandedCollections,
    createCollection,
    toggleCollectionExpanded,
    loadCollections
  } = useCollectionStore()
  const { history, loadHistory } = useHistoryStore()
  const { createNewTab, createGraphQLTab, createWebSocketTab, createSSETab } = useAppStore()

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newRequestMenuRef.current && !newRequestMenuRef.current.contains(e.target as Node)) {
        setShowNewRequestMenu(false)
      }
    }
    if (showNewRequestMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNewRequestMenu])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

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

  const handleContextMenu = (
    e: React.MouseEvent,
    type: 'collection' | 'folder' | 'request',
    data: Collection | Folder | CollectionRequest,
    collectionId?: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, type, data, collectionId })
  }

  return (
    <div className="w-64 bg-sidebar flex flex-col border-r border-panel-border">
      {/* Header with drag region for macOS traffic lights */}
      <div
        className="h-10 flex items-center border-b border-panel-border pl-20"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="font-semibold text-white">Put-Man</span>
      </div>

      {/* New Request Button with Dropdown */}
      <div className="p-2 border-b border-panel-border relative" ref={newRequestMenuRef}>
        <button
          className="w-full btn btn-primary flex items-center justify-center gap-2"
          onClick={() => setShowNewRequestMenu(!showNewRequestMenu)}
        >
          <PlusIcon />
          New Request
          <ChevronDownIcon />
        </button>
        {showNewRequestMenu && (
          <div className="absolute left-2 right-2 top-full mt-1 bg-gray-800 border border-panel-border rounded-md shadow-lg z-50 overflow-hidden">
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                createNewTab()
                setShowNewRequestMenu(false)
              }}
            >
              <span className="text-green-400 font-semibold text-xs w-10">HTTP</span>
              HTTP Request
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                createGraphQLTab()
                setShowNewRequestMenu(false)
              }}
            >
              <span className="text-pink-400 font-semibold text-xs w-10">GQL</span>
              GraphQL
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                createWebSocketTab()
                setShowNewRequestMenu(false)
              }}
            >
              <span className="text-purple-400 font-semibold text-xs w-10">WS</span>
              WebSocket
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                createSSETab()
                setShowNewRequestMenu(false)
              }}
            >
              <span className="text-cyan-400 font-semibold text-xs w-10">SSE</span>
              Server-Sent Events
            </button>
          </div>
        )}
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
            folders={folders}
            requests={requests}
            expandedCollections={expandedCollections}
            isCreating={isCreating}
            setIsCreating={setIsCreating}
            newCollectionName={newCollectionName}
            setNewCollectionName={setNewCollectionName}
            onCreateCollection={handleCreateCollection}
            onToggleExpanded={toggleCollectionExpanded}
            onContextMenu={handleContextMenu}
          />
        ) : (
          <HistoryList history={history} />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenuWrapper
          state={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

interface CollectionsListProps {
  collections: Collection[]
  folders: Record<string, Folder[]>
  requests: Record<string, CollectionRequest[]>
  expandedCollections: Set<string>
  isCreating: boolean
  setIsCreating: (value: boolean) => void
  newCollectionName: string
  setNewCollectionName: (value: string) => void
  onCreateCollection: () => void
  onToggleExpanded: (id: string) => void
  onContextMenu: (
    e: React.MouseEvent,
    type: 'collection' | 'folder' | 'request',
    data: Collection | Folder | CollectionRequest,
    collectionId?: string
  ) => void
}

function CollectionsList({
  collections,
  folders,
  requests,
  expandedCollections,
  isCreating,
  setIsCreating,
  newCollectionName,
  setNewCollectionName,
  onCreateCollection,
  onToggleExpanded,
  onContextMenu
}: CollectionsListProps) {
  const { loadCollections } = useCollectionStore()

  const handleImportPostman = async () => {
    try {
      const file = await window.api.file.openFile([
        { name: 'Postman Collection', extensions: ['json'] }
      ])
      if (file) {
        await window.api.import.postmanCollection(file.path)
        await loadCollections()
      }
    } catch (error) {
      console.error('Import failed:', error)
    }
  }

  return (
    <div className="p-2">
      {/* Add collection and import buttons */}
      {!isCreating && (
        <div className="flex gap-1 mb-1">
          <button
            className="sidebar-item flex-1 text-gray-400 hover:text-gray-200"
            onClick={() => setIsCreating(true)}
          >
            <PlusIcon />
            Add
          </button>
          <button
            className="sidebar-item flex-1 text-gray-400 hover:text-gray-200"
            onClick={handleImportPostman}
            title="Import Postman Collection"
          >
            <ImportIcon />
            Import
          </button>
        </div>
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
        <CollectionItem
          key={collection.id}
          collection={collection}
          folders={folders[collection.id] || []}
          requests={requests[collection.id] || []}
          isExpanded={expandedCollections.has(collection.id)}
          onToggle={() => onToggleExpanded(collection.id)}
          onContextMenu={onContextMenu}
        />
      ))}

      {collections.length === 0 && !isCreating && (
        <div className="text-center text-gray-500 text-sm py-4">No collections yet</div>
      )}
    </div>
  )
}

interface CollectionItemProps {
  collection: Collection
  folders: Folder[]
  requests: CollectionRequest[]
  isExpanded: boolean
  onToggle: () => void
  onContextMenu: (
    e: React.MouseEvent,
    type: 'collection' | 'folder' | 'request',
    data: Collection | Folder | CollectionRequest,
    collectionId?: string
  ) => void
}

function CollectionItem({
  collection,
  folders,
  requests,
  isExpanded,
  onToggle,
  onContextMenu
}: CollectionItemProps) {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const { createFolder, moveRequest } = useCollectionStore()

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(collection.id, newFolderName.trim())
      setNewFolderName('')
      setIsCreatingFolder(false)
    }
  }

  // Build folder tree structure
  const rootFolders = folders.filter((f) => !f.parentId)
  const rootRequests = requests.filter((r) => !r.folderId)

  // Count total items
  const totalItems = folders.length + requests.length

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const requestId = e.dataTransfer.getData('requestId')
    const sourceCollectionId = e.dataTransfer.getData('collectionId')

    if (requestId && sourceCollectionId === collection.id) {
      // Move to collection root (no folder)
      await moveRequest(requestId, collection.id, undefined)
    }
  }

  return (
    <div>
      <button
        className={`sidebar-item w-full group ${isDragOver ? 'bg-accent/30 border border-accent' : ''}`}
        onClick={onToggle}
        onContextMenu={(e) => onContextMenu(e, 'collection', collection)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ChevronIcon expanded={isExpanded} />
        <FolderIcon />
        <span className="truncate flex-1">{collection.name}</span>
        <span className="text-gray-500 text-xs">{totalItems}</span>
      </button>

      {isExpanded && (
        <div className="ml-4 border-l border-panel-border">
          {/* New folder button */}
          {!isCreatingFolder && (
            <button
              className="sidebar-item w-full text-gray-500 hover:text-gray-300 text-xs"
              onClick={() => setIsCreatingFolder(true)}
            >
              <PlusIcon />
              Add Folder
            </button>
          )}

          {/* New folder input */}
          {isCreatingFolder && (
            <div className="p-1">
              <input
                type="text"
                className="input w-full mb-1 text-xs"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') setIsCreatingFolder(false)
                }}
                autoFocus
              />
              <div className="flex gap-1">
                <button className="btn btn-primary flex-1 text-xs py-0.5" onClick={handleCreateFolder}>
                  Create
                </button>
                <button
                  className="btn btn-secondary flex-1 text-xs py-0.5"
                  onClick={() => setIsCreatingFolder(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Folders */}
          {rootFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              folders={folders}
              requests={requests}
              collectionId={collection.id}
              onContextMenu={onContextMenu}
              depth={0}
            />
          ))}

          {/* Root requests (not in any folder) */}
          {rootRequests.map((request) => (
            <RequestItem
              key={request.id}
              request={request}
              collectionId={collection.id}
              onContextMenu={onContextMenu}
            />
          ))}

          {rootFolders.length === 0 && rootRequests.length === 0 && !isCreatingFolder && (
            <div className="text-gray-500 text-xs py-2 px-3">No items yet</div>
          )}
        </div>
      )}
    </div>
  )
}

interface FolderItemProps {
  folder: Folder
  folders: Folder[]
  requests: CollectionRequest[]
  collectionId: string
  onContextMenu: (
    e: React.MouseEvent,
    type: 'collection' | 'folder' | 'request',
    data: Collection | Folder | CollectionRequest,
    collectionId?: string
  ) => void
  depth: number
}

function FolderItem({
  folder,
  folders,
  requests,
  collectionId,
  onContextMenu,
  depth
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const { moveRequest } = useCollectionStore()

  // Get child folders and requests
  const childFolders = folders.filter((f) => f.parentId === folder.id)
  const childRequests = requests.filter((r) => r.folderId === folder.id)
  const itemCount = childFolders.length + childRequests.length

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const requestId = e.dataTransfer.getData('requestId')
    const sourceCollectionId = e.dataTransfer.getData('collectionId')

    if (requestId && sourceCollectionId === collectionId) {
      await moveRequest(requestId, collectionId, folder.id)
      setIsExpanded(true)
    }
  }

  return (
    <div>
      <button
        className={`sidebar-item w-full group ${isDragOver ? 'bg-accent/30 border border-accent' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        onContextMenu={(e) => onContextMenu(e, 'folder', folder, collectionId)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ChevronIcon expanded={isExpanded} />
        <SubFolderIcon />
        <span className="truncate flex-1 text-sm">{folder.name}</span>
        <span className="text-gray-500 text-xs">{itemCount}</span>
      </button>

      {isExpanded && (
        <div className="ml-4 border-l border-panel-border">
          {/* Child folders */}
          {childFolders.map((childFolder) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              folders={folders}
              requests={requests}
              collectionId={collectionId}
              onContextMenu={onContextMenu}
              depth={depth + 1}
            />
          ))}

          {/* Child requests */}
          {childRequests.map((request) => (
            <RequestItem
              key={request.id}
              request={request}
              collectionId={collectionId}
              onContextMenu={onContextMenu}
            />
          ))}

          {childFolders.length === 0 && childRequests.length === 0 && (
            <div className="text-gray-500 text-xs py-1 px-3">Empty</div>
          )}
        </div>
      )}
    </div>
  )
}

interface RequestItemProps {
  request: CollectionRequest
  collectionId: string
  onContextMenu: (
    e: React.MouseEvent,
    type: 'collection' | 'folder' | 'request',
    data: Collection | Folder | CollectionRequest,
    collectionId?: string
  ) => void
}

function RequestItem({ request, collectionId, onContextMenu }: RequestItemProps) {
  const { openRequestInNewTab } = useAppStore()
  const [isDragging, setIsDragging] = useState(false)

  const handleClick = () => {
    openRequestInNewTab(request.request)
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('requestId', request.id)
    e.dataTransfer.setData('collectionId', collectionId)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <button
      className={`sidebar-item w-full group ${isDragging ? 'opacity-50' : ''}`}
      onClick={handleClick}
      onContextMenu={(e) => onContextMenu(e, 'request', request, collectionId)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {request.request.type === 'http' && (
        <MethodBadge method={(request.request as HttpRequest).method} />
      )}
      {request.request.type === 'graphql' && (
        <span className="method-badge method-post">GQL</span>
      )}
      {request.request.type === 'grpc' && (
        <span className="method-badge method-options">gRPC</span>
      )}
      <span className="truncate text-sm">{request.request.name || 'Untitled'}</span>
    </button>
  )
}

interface ContextMenuWrapperProps {
  state: ContextMenuState
  onClose: () => void
}

function ContextMenuWrapper({ state, onClose }: ContextMenuWrapperProps) {
  const {
    updateCollection,
    deleteCollection,
    updateFolder,
    deleteFolder,
    deleteRequest,
    duplicateRequest
  } = useCollectionStore()
  const { openRequestInNewTab } = useAppStore()

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  const handleRename = async () => {
    if (!renameValue.trim()) return

    if (state.type === 'collection') {
      await updateCollection((state.data as Collection).id, { name: renameValue.trim() })
    } else if (state.type === 'folder') {
      await updateFolder((state.data as Folder).id, { name: renameValue.trim() })
    }
    setIsRenaming(false)
    onClose()
  }

  if (isRenaming) {
    return (
      <div
        className="fixed z-50 bg-input-bg border border-panel-border rounded-md shadow-lg p-2 min-w-[200px]"
        style={{ left: state.x, top: state.y }}
      >
        <input
          type="text"
          className="input w-full mb-2"
          placeholder="New name"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') {
              setIsRenaming(false)
              onClose()
            }
          }}
          autoFocus
        />
        <div className="flex gap-1">
          <button className="btn btn-primary flex-1 text-xs" onClick={handleRename}>
            Rename
          </button>
          <button
            className="btn btn-secondary flex-1 text-xs"
            onClick={() => {
              setIsRenaming(false)
              onClose()
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  let items: ContextMenuItem[] = []

  if (state.type === 'collection') {
    const collection = state.data as Collection

    const handleExport = async (format: 'native' | 'postman') => {
      try {
        const content = await window.api.export.collection(collection.id, format)
        const extension = format === 'postman' ? 'postman_collection.json' : 'json'
        await window.api.file.saveFile(content, `${collection.name}.${extension}`)
      } catch (error) {
        console.error('Export failed:', error)
      }
    }

    items = [
      {
        id: 'rename',
        label: 'Rename',
        icon: <EditIcon />,
        onClick: () => {
          setRenameValue(collection.name)
          setIsRenaming(true)
        }
      },
      {
        id: 'export-postman',
        label: 'Export as Postman',
        icon: <ExportIcon />,
        onClick: () => handleExport('postman')
      },
      {
        id: 'export-native',
        label: 'Export as JSON',
        icon: <ExportIcon />,
        onClick: () => handleExport('native')
      },
      {
        id: 'separator-1',
        label: '',
        separator: true,
        onClick: () => {}
      },
      {
        id: 'delete',
        label: 'Delete Collection',
        icon: <TrashIcon />,
        danger: true,
        onClick: () => deleteCollection(collection.id)
      }
    ]
  } else if (state.type === 'folder') {
    const folder = state.data as Folder
    items = [
      {
        id: 'rename',
        label: 'Rename',
        icon: <EditIcon />,
        onClick: () => {
          setRenameValue(folder.name)
          setIsRenaming(true)
        }
      },
      {
        id: 'separator-1',
        label: '',
        separator: true,
        onClick: () => {}
      },
      {
        id: 'delete',
        label: 'Delete Folder',
        icon: <TrashIcon />,
        danger: true,
        onClick: () => deleteFolder(folder.id)
      }
    ]
  } else if (state.type === 'request') {
    const collectionRequest = state.data as CollectionRequest
    items = [
      {
        id: 'open',
        label: 'Open',
        icon: <OpenIcon />,
        onClick: () => openRequestInNewTab(collectionRequest.request)
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: <DuplicateIcon />,
        onClick: () => {
          if (state.collectionId) {
            duplicateRequest(collectionRequest.id, state.collectionId)
          }
        }
      },
      {
        id: 'separator-1',
        label: '',
        separator: true,
        onClick: () => {}
      },
      {
        id: 'delete',
        label: 'Delete Request',
        icon: <TrashIcon />,
        danger: true,
        onClick: () => {
          if (state.collectionId) {
            deleteRequest(collectionRequest.id, state.collectionId)
          }
        }
      }
    ]
  }

  return <ContextMenu x={state.x} y={state.y} items={items} onClose={onClose} />
}

interface HistoryListProps {
  history: HistoryEntry[]
}

function HistoryList({ history }: HistoryListProps) {
  const { openRequestInNewTab } = useAppStore()
  const { clearHistory } = useHistoryStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState<HttpMethod | 'ALL'>('ALL')

  const filteredHistory = history.filter((entry) => {
    // Filter by search query
    const searchLower = searchQuery.toLowerCase()
    let matchesSearch = true
    if (searchQuery) {
      if (entry.request.type === 'http') {
        const httpReq = entry.request as HttpRequest
        matchesSearch =
          httpReq.url.toLowerCase().includes(searchLower) ||
          (httpReq.name?.toLowerCase().includes(searchLower) ?? false)
      } else {
        matchesSearch = entry.request.name?.toLowerCase().includes(searchLower) ?? false
      }
    }

    // Filter by method
    let matchesMethod = true
    if (methodFilter !== 'ALL' && entry.request.type === 'http') {
      matchesMethod = (entry.request as HttpRequest).method === methodFilter
    }

    return matchesSearch && matchesMethod
  })

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleClearHistory = async () => {
    if (confirm('Clear all history? This cannot be undone.')) {
      await clearHistory()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and filters */}
      <div className="p-2 border-b border-panel-border space-y-2">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            className="input w-full pl-7 text-xs"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              onClick={() => setSearchQuery('')}
            >
              <ClearIcon />
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="select text-xs flex-1"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as HttpMethod | 'ALL')}
          >
            <option value="ALL">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
          {history.length > 0 && (
            <button
              className="text-xs text-gray-500 hover:text-red-400"
              onClick={handleClearHistory}
              title="Clear history"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto p-2">
        {history.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">No history yet</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">No matching results</div>
        ) : (
          filteredHistory.map((entry) => (
            <button
              key={entry.id}
              className="sidebar-item w-full group"
              onClick={() => openRequestInNewTab(entry.request)}
              title={entry.request.type === 'http' ? (entry.request as HttpRequest).url : entry.request.name}
            >
              <div className="flex-1 flex items-center gap-2 min-w-0">
                {entry.request.type === 'http' && (
                  <MethodBadge method={(entry.request as HttpRequest).method} />
                )}
                {entry.request.type === 'graphql' && (
                  <span className="method-badge method-post">GQL</span>
                )}
                {entry.request.type === 'grpc' && (
                  <span className="method-badge method-options">gRPC</span>
                )}
                <span className="truncate text-xs">
                  {entry.request.type === 'http'
                    ? (entry.request as HttpRequest).url
                    : entry.request.name}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 shrink-0">
                {formatTimestamp(entry.timestamp)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
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

function SubFolderIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function ChevronDownIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

function DuplicateIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}
