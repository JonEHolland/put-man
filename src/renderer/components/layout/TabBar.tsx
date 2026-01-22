import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import EnvironmentManager from '../common/EnvironmentManager'
import ContextMenu, { type ContextMenuItem } from '../common/ContextMenu'
import type { Tab, HttpMethod } from '../../../shared/types/models'

interface NewTabMenuState {
  x: number
  y: number
}

interface TabContextMenuState {
  x: number
  y: number
  tabId: string
}

export default function TabBar() {
  const {
    tabs,
    activeTab,
    setActiveTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    closeTabsToRight,
    duplicateTab,
    reorderTabs,
    createNewTab,
    createWebSocketTab,
    createSSETab
  } = useAppStore()
  const { environments, activeEnvironment, setActiveEnvironment } = useEnvironmentStore()
  const [showEnvManager, setShowEnvManager] = useState(false)
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null)
  const [newTabMenu, setNewTabMenu] = useState<NewTabMenuState | null>(null)
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  return (
    <div
      className="h-10 bg-sidebar flex items-center border-b border-panel-border"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Traffic light spacer for macOS */}
      <div className="w-20 shrink-0" />

      {/* Tabs */}
      <div
        className="flex-1 flex items-center overflow-x-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.id}
            tab={tab}
            index={index}
            isActive={tab.id === activeTab}
            isDragging={draggedTabId === tab.id}
            isDragOver={dragOverIndex === index}
            onClick={() => setActiveTab(tab.id)}
            onClose={() => closeTab(tab.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id })
            }}
            onDragStart={() => setDraggedTabId(tab.id)}
            onDragEnd={() => {
              setDraggedTabId(null)
              setDragOverIndex(null)
            }}
            onDragOver={(targetIndex) => setDragOverIndex(targetIndex)}
            onDrop={(targetIndex) => {
              const fromIndex = tabs.findIndex((t) => t.id === draggedTabId)
              if (fromIndex !== -1 && fromIndex !== targetIndex) {
                reorderTabs(fromIndex, targetIndex)
              }
              setDraggedTabId(null)
              setDragOverIndex(null)
            }}
          />
        ))}

        {/* New tab button with dropdown */}
        <button
          className="px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-sidebar-hover"
          onClick={createNewTab}
          onContextMenu={(e) => {
            e.preventDefault()
            setNewTabMenu({ x: e.clientX, y: e.clientY })
          }}
          title="New Tab (right-click for options)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* New Tab Context Menu */}
      {newTabMenu && (
        <NewTabContextMenu
          x={newTabMenu.x}
          y={newTabMenu.y}
          onClose={() => setNewTabMenu(null)}
          onNewHttpTab={() => {
            createNewTab()
            setNewTabMenu(null)
          }}
          onNewWebSocketTab={() => {
            createWebSocketTab()
            setNewTabMenu(null)
          }}
          onNewSSETab={() => {
            createSSETab()
            setNewTabMenu(null)
          }}
        />
      )}

      {/* Environment selector */}
      <div
        className="px-3 flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <label className="text-xs text-gray-400">Env:</label>
        <select
          className="select text-xs py-1"
          value={activeEnvironment?.id || ''}
          onChange={(e) => setActiveEnvironment(e.target.value || null)}
        >
          <option value="">No Environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <button
          className="p-1 text-gray-400 hover:text-gray-200 hover:bg-sidebar-hover rounded"
          onClick={() => setShowEnvManager(true)}
          title="Manage Environments"
        >
          <GearIcon />
        </button>
      </div>

      {/* Environment Manager Modal */}
      {showEnvManager && <EnvironmentManager onClose={() => setShowEnvManager(false)} />}

      {/* Tab Context Menu */}
      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          tabCount={tabs.length}
          tabIndex={tabs.findIndex((t) => t.id === contextMenu.tabId)}
          onClose={() => setContextMenu(null)}
          onCloseTab={() => {
            closeTab(contextMenu.tabId)
            setContextMenu(null)
          }}
          onCloseOtherTabs={() => {
            closeOtherTabs(contextMenu.tabId)
            setContextMenu(null)
          }}
          onCloseTabsToRight={() => {
            closeTabsToRight(contextMenu.tabId)
            setContextMenu(null)
          }}
          onCloseAllTabs={() => {
            closeAllTabs()
            setContextMenu(null)
          }}
          onDuplicateTab={() => {
            duplicateTab(contextMenu.tabId)
            setContextMenu(null)
          }}
        />
      )}
    </div>
  )
}

interface TabContextMenuProps {
  x: number
  y: number
  tabId: string
  tabCount: number
  tabIndex: number
  onClose: () => void
  onCloseTab: () => void
  onCloseOtherTabs: () => void
  onCloseTabsToRight: () => void
  onCloseAllTabs: () => void
  onDuplicateTab: () => void
}

function TabContextMenu({
  x,
  y,
  tabCount,
  tabIndex,
  onClose,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseAllTabs,
  onDuplicateTab
}: TabContextMenuProps) {
  const items: ContextMenuItem[] = [
    {
      id: 'duplicate',
      label: 'Duplicate Tab',
      icon: <DuplicateIcon />,
      onClick: onDuplicateTab
    },
    {
      id: 'separator-1',
      label: '',
      separator: true,
      onClick: () => {}
    },
    {
      id: 'close',
      label: 'Close Tab',
      icon: <CloseTabIcon />,
      onClick: onCloseTab
    },
    {
      id: 'close-others',
      label: 'Close Other Tabs',
      icon: <CloseOthersIcon />,
      onClick: onCloseOtherTabs,
      disabled: tabCount <= 1
    },
    {
      id: 'close-right',
      label: 'Close Tabs to the Right',
      icon: <CloseRightIcon />,
      onClick: onCloseTabsToRight,
      disabled: tabIndex === tabCount - 1
    },
    {
      id: 'separator-2',
      label: '',
      separator: true,
      onClick: () => {}
    },
    {
      id: 'close-all',
      label: 'Close All Tabs',
      icon: <CloseAllIcon />,
      danger: true,
      onClick: onCloseAllTabs
    }
  ]

  return <ContextMenu x={x} y={y} items={items} onClose={onClose} />
}

interface TabItemProps {
  tab: Tab
  index: number
  isActive: boolean
  isDragging: boolean
  isDragOver: boolean
  onClick: () => void
  onClose: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (index: number) => void
  onDrop: (index: number) => void
}

function TabItem({
  tab,
  index,
  isActive,
  isDragging,
  isDragOver,
  onClick,
  onClose,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: TabItemProps) {
  const method = tab.request.type === 'http' ? (tab.request as any).method : null
  const isWebSocket = tab.request.type === 'websocket'
  const isSSE = tab.request.type === 'sse'
  const wsConnected = isWebSocket && tab.wsState?.status === 'connected'
  const sseConnected = isSSE && tab.sseState?.status === 'connected'

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver(index)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop(index)
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-r border-panel-border cursor-pointer transition-all ${
        isActive ? 'bg-panel text-white' : 'bg-sidebar text-gray-400 hover:text-gray-200'
      } ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-2 border-l-accent' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {method && <MethodBadge method={method} />}
      {isWebSocket && <WebSocketBadge connected={wsConnected} />}
      {isSSE && <SSEBadge connected={sseConnected} />}
      <span className="text-sm truncate max-w-32">
        {tab.title || 'Untitled'}
        {tab.isDirty && <span className="ml-1">*</span>}
      </span>
      <button
        className="ml-1 p-0.5 rounded hover:bg-gray-600"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function MethodBadge({ method }: { method: HttpMethod }) {
  const methodClass = `method-${method.toLowerCase()}`
  return <span className={`method-badge text-[10px] ${methodClass}`}>{method}</span>
}

function GearIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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

function CloseTabIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CloseOthersIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  )
}

function CloseRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 5l7 7-7 7M5 5l7 7-7 7"
      />
    </svg>
  )
}

function CloseAllIcon() {
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

function WebSocketBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`method-badge text-[10px] ${
        connected ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'
      }`}
    >
      WS
    </span>
  )
}

function SSEBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`method-badge text-[10px] ${
        connected ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'
      }`}
    >
      SSE
    </span>
  )
}

interface NewTabContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onNewHttpTab: () => void
  onNewWebSocketTab: () => void
  onNewSSETab: () => void
}

function NewTabContextMenu({
  x,
  y,
  onClose,
  onNewHttpTab,
  onNewWebSocketTab,
  onNewSSETab
}: NewTabContextMenuProps) {
  const items: ContextMenuItem[] = [
    {
      id: 'http',
      label: 'HTTP Request',
      icon: <HttpIcon />,
      onClick: onNewHttpTab
    },
    {
      id: 'websocket',
      label: 'WebSocket',
      icon: <WebSocketIcon />,
      onClick: onNewWebSocketTab
    },
    {
      id: 'sse',
      label: 'SSE (Server-Sent Events)',
      icon: <SSEIcon />,
      onClick: onNewSSETab
    }
  ]

  return <ContextMenu x={x} y={y} items={items} onClose={onClose} />
}

function HttpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function WebSocketIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  )
}

function SSEIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  )
}
