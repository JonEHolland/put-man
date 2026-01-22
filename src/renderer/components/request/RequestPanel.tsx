import { useState } from 'react'
import UrlBar from './UrlBar'
import ParamsEditor from './ParamsEditor'
import HeadersEditor from './HeadersEditor'
import BodyEditor from './BodyEditor'
import AuthPanel from './AuthPanel'
import ScriptsPanel from './ScriptsPanel'
import type { Tab, HttpRequest } from '../../../shared/types/models'

type RequestTab = 'params' | 'auth' | 'headers' | 'body' | 'scripts'

interface RequestPanelProps {
  tab: Tab
}

export default function RequestPanel({ tab }: RequestPanelProps) {
  const [activeSection, setActiveSection] = useState<RequestTab>('params')
  const request = tab.request as HttpRequest

  const hasScripts = !!(request.preRequestScript?.trim() || request.testScript?.trim())

  const tabItems: { id: RequestTab; label: string; badge?: number; dot?: boolean }[] = [
    { id: 'params', label: 'Params', badge: request.params?.filter((p) => p.enabled).length },
    { id: 'auth', label: 'Auth' },
    { id: 'headers', label: 'Headers', badge: request.headers?.filter((h) => h.enabled).length },
    { id: 'body', label: 'Body' },
    { id: 'scripts', label: 'Scripts', dot: hasScripts }
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
            {item.dot && (
              <span className="ml-1.5 w-2 h-2 inline-block rounded-full bg-orange-500" />
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
        {activeSection === 'scripts' && <ScriptsPanel tab={tab} />}
      </div>
    </div>
  )
}
