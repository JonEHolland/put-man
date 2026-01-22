import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import type { Tab, HttpMethod } from '../../../shared/types/models'

export default function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab, createNewTab } = useAppStore()
  const { environments, activeEnvironment, setActiveEnvironment } = useEnvironmentStore()

  return (
    <div className="h-10 bg-sidebar flex items-center border-b border-panel-border">
      {/* Tabs */}
      <div className="flex-1 flex items-center overflow-x-auto">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTab}
            onClick={() => setActiveTab(tab.id)}
            onClose={() => closeTab(tab.id)}
          />
        ))}

        {/* New tab button */}
        <button
          className="px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-sidebar-hover"
          onClick={createNewTab}
          title="New Tab"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Environment selector */}
      <div className="px-3 flex items-center gap-2">
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
      </div>
    </div>
  )
}

interface TabItemProps {
  tab: Tab
  isActive: boolean
  onClick: () => void
  onClose: () => void
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  const method = tab.request.type === 'http' ? (tab.request as any).method : null

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-r border-panel-border cursor-pointer ${
        isActive ? 'bg-panel text-white' : 'bg-sidebar text-gray-400 hover:text-gray-200'
      }`}
      onClick={onClick}
    >
      {method && <MethodBadge method={method} />}
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
