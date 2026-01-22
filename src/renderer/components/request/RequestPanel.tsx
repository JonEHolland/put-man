import { useState } from 'react'
import UrlBar from './UrlBar'
import ParamsEditor from './ParamsEditor'
import HeadersEditor from './HeadersEditor'
import BodyEditor from './BodyEditor'
import AuthPanel from './AuthPanel'
import type { Tab, HttpRequest } from '../../../shared/types/models'

type RequestTab = 'params' | 'auth' | 'headers' | 'body'

interface RequestPanelProps {
  tab: Tab
}

export default function RequestPanel({ tab }: RequestPanelProps) {
  const [activeSection, setActiveSection] = useState<RequestTab>('params')
  const request = tab.request as HttpRequest

  const tabItems: { id: RequestTab; label: string; badge?: number }[] = [
    { id: 'params', label: 'Params', badge: request.params?.filter((p) => p.enabled).length },
    { id: 'auth', label: 'Auth' },
    { id: 'headers', label: 'Headers', badge: request.headers?.filter((h) => h.enabled).length },
    { id: 'body', label: 'Body' }
  ]

  return (
    <div className="flex flex-col border-b border-panel-border">
      {/* URL Bar */}
      <UrlBar tab={tab} />

      {/* Tab navigation */}
      <div className="flex border-b border-panel-border bg-sidebar">
        {tabItems.map((item) => (
          <button
            key={item.id}
            className={`tab ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-600 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="h-48 overflow-auto bg-panel">
        {activeSection === 'params' && <ParamsEditor tab={tab} />}
        {activeSection === 'auth' && <AuthPanel tab={tab} />}
        {activeSection === 'headers' && <HeadersEditor tab={tab} />}
        {activeSection === 'body' && <BodyEditor tab={tab} />}
      </div>
    </div>
  )
}
