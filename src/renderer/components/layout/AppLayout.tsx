import { useEffect, useCallback, useState } from 'react'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import RequestPanel from '../request/RequestPanel'
import ResponsePanel from '../response/ResponsePanel'
import GraphQLPanel from '../graphql/GraphQLPanel'
import WebSocketPanel from '../websocket/WebSocketPanel'
import SSEPanel from '../sse/SSEPanel'
import ToastContainer from '../common/Toast'
import ImportExportModal from '../common/ImportExportModal'
import { useAppStore } from '../../stores/appStore'
import { useCollectionStore } from '../../stores/collectionStore'
import { useEnvironmentStore } from '../../stores/environmentStore'

export default function AppLayout() {
  const { activeTab, tabs, createNewTab, closeTab, sendRequest, sendGraphQLRequest, duplicateTab } = useAppStore()
  const { loadCollections, createCollection } = useCollectionStore()
  const { loadEnvironments, activeEnvironment } = useEnvironmentStore()
  const [showImportExport, setShowImportExport] = useState<'import' | 'export' | null>(null)

  useEffect(() => {
    loadCollections()
    loadEnvironments()
  }, [loadCollections, loadEnvironments])

  // Menu event listeners
  useEffect(() => {
    const unsubNewRequest = window.api.menu.onNewRequest(() => {
      createNewTab()
    })

    const unsubNewCollection = window.api.menu.onNewCollection(async () => {
      const name = prompt('Enter collection name:')
      if (name?.trim()) {
        await createCollection(name.trim())
      }
    })

    const unsubImport = window.api.menu.onImport(() => {
      setShowImportExport('import')
    })

    const unsubExport = window.api.menu.onExport(() => {
      setShowImportExport('export')
    })

    const unsubCloseTab = window.api.menu.onCloseTab(() => {
      if (activeTab) {
        closeTab(activeTab)
      }
    })

    return () => {
      unsubNewRequest()
      unsubNewCollection()
      unsubImport()
      unsubExport()
      unsubCloseTab()
    }
  }, [activeTab, closeTab, createNewTab, createCollection])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd+T: New tab
      if (isMod && e.key === 't') {
        e.preventDefault()
        createNewTab()
        return
      }

      // Cmd+W: Close current tab
      if (isMod && e.key === 'w') {
        e.preventDefault()
        if (activeTab) {
          closeTab(activeTab)
        }
        return
      }

      // Cmd+Enter: Send request
      if (isMod && e.key === 'Enter') {
        e.preventDefault()
        if (activeTab) {
          const currentTab = tabs.find((t) => t.id === activeTab)
          if (currentTab?.request.type === 'graphql') {
            sendGraphQLRequest(activeTab, activeEnvironment)
          } else if (currentTab?.request.type === 'http') {
            sendRequest(activeTab, activeEnvironment)
          }
        }
        return
      }

      // Cmd+D: Duplicate tab
      if (isMod && e.key === 'd') {
        e.preventDefault()
        if (activeTab) {
          duplicateTab(activeTab)
        }
        return
      }

      // Cmd+1-9: Switch to tab by index
      if (isMod && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        if (index < tabs.length) {
          useAppStore.getState().setActiveTab(tabs[index].id)
        }
        return
      }
    },
    [activeTab, tabs, createNewTab, closeTab, sendRequest, sendGraphQLRequest, duplicateTab, activeEnvironment]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const currentTab = tabs.find((t) => t.id === activeTab)

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar with tabs and environment selector */}
          <TabBar />

          {/* Request and Response panels */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {currentTab ? (
              currentTab.request.type === 'websocket' ? (
                <WebSocketPanel tab={currentTab} />
              ) : currentTab.request.type === 'sse' ? (
                <SSEPanel tab={currentTab} />
              ) : currentTab.request.type === 'graphql' ? (
                <>
                  <GraphQLPanel tab={currentTab} />
                  <ResponsePanel request={currentTab.request} response={currentTab.response} />
                </>
              ) : (
                <>
                  <RequestPanel tab={currentTab} />
                  <ResponsePanel request={currentTab.request} response={currentTab.response} />
                </>
              )
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
      {showImportExport && (
        <ImportExportModal
          mode={showImportExport}
          onClose={() => setShowImportExport(null)}
        />
      )}
    </>
  )
}

function EmptyState() {
  const { createNewTab, createGraphQLTab, createWebSocketTab, createSSETab } = useAppStore()

  return (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-400 mb-2">No Request Open</h2>
        <p className="mb-4">Create a new request or select one from the sidebar</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button className="btn btn-primary" onClick={createNewTab}>
            New HTTP Request
          </button>
          <button className="btn btn-secondary" onClick={createGraphQLTab}>
            New GraphQL
          </button>
          <button className="btn btn-secondary" onClick={createWebSocketTab}>
            New WebSocket
          </button>
          <button className="btn btn-secondary" onClick={createSSETab}>
            New SSE
          </button>
        </div>
      </div>
    </div>
  )
}
