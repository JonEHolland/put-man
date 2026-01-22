import { useEffect } from 'react'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import RequestPanel from '../request/RequestPanel'
import ResponsePanel from '../response/ResponsePanel'
import { useAppStore } from '../../stores/appStore'
import { useCollectionStore } from '../../stores/collectionStore'
import { useEnvironmentStore } from '../../stores/environmentStore'

export default function AppLayout() {
  const { activeTab, tabs } = useAppStore()
  const { loadCollections } = useCollectionStore()
  const { loadEnvironments } = useEnvironmentStore()

  useEffect(() => {
    loadCollections()
    loadEnvironments()
  }, [loadCollections, loadEnvironments])

  const currentTab = tabs.find((t) => t.id === activeTab)

  return (
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
            <>
              <RequestPanel tab={currentTab} />
              <ResponsePanel response={currentTab.response} />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  const { createNewTab } = useAppStore()

  return (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-400 mb-2">No Request Open</h2>
        <p className="mb-4">Create a new request or select one from the sidebar</p>
        <button className="btn btn-primary" onClick={createNewTab}>
          New Request
        </button>
      </div>
    </div>
  )
}
