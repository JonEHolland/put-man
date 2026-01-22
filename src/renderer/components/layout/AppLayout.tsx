import { useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import RequestPanel from '../request/RequestPanel'
import ResponsePanel from '../response/ResponsePanel'
import WebSocketPanel from '../websocket/WebSocketPanel'
import SSEPanel from '../sse/SSEPanel'
import ToastContainer from '../common/Toast'
import { useAppStore } from '../../stores/appStore'
import { useCollectionStore } from '../../stores/collectionStore'
import { useEnvironmentStore } from '../../stores/environmentStore'

export default function AppLayout() {
  const { activeTab, tabs, createNewTab, closeTab, sendRequest, duplicateTab } = useAppStore()
  const { loadCollections } = useCollectionStore()
  const { loadEnvironments, activeEnvironment } = useEnvironmentStore()

  useEffect(() => {
    loadCollections()
    loadEnvironments()
  }, [loadCollections, loadEnvironments])

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
          sendRequest(activeTab, activeEnvironment)
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
    [activeTab, tabs, createNewTab, closeTab, sendRequest, duplicateTab, activeEnvironment]
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
    </>
  )
}

function EmptyState() {
  const { createNewTab, createWebSocketTab, createSSETab } = useAppStore()

  return (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-400 mb-2">No Request Open</h2>
        <p className="mb-4">Create a new request or select one from the sidebar</p>
        <div className="flex gap-3 justify-center">
          <button className="btn btn-primary" onClick={createNewTab}>
            New HTTP Request
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
