import { useState, KeyboardEvent } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import VariableHighlightInput from '../common/VariableHighlightInput'
import MetadataEditor from './MetadataEditor'
import AuthPanel from '../request/AuthPanel'
import ScriptsPanel from '../request/ScriptsPanel'
import CodeEditor from '../common/CodeEditor'
import SaveToCollectionModal from '../common/SaveToCollectionModal'
import type { Tab, GrpcRequest } from '../../../shared/types/models'

type ConfigTab = 'metadata' | 'auth' | 'scripts'

interface GrpcPanelProps {
  tab: Tab
}

interface ProtoInfo {
  services: string[]
  methods: Record<string, string[]>
}

export default function GrpcPanel({ tab }: GrpcPanelProps) {
  const { updateTab, sendGrpcRequest } = useAppStore()
  const { activeEnvironment } = useEnvironmentStore()
  const [configTab, setConfigTab] = useState<ConfigTab>('metadata')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [protoInfo, setProtoInfo] = useState<ProtoInfo | null>(null)
  const [protoLoading, setProtoLoading] = useState(false)
  const [protoError, setProtoError] = useState<string | null>(null)

  const request = tab.request as GrpcRequest
  const isLoading = tab.isLoading
  const hasScripts = !!(request.preRequestScript?.trim() || request.testScript?.trim())

  const handleUrlChange = (url: string) => {
    updateTab(tab.id, {
      request: { ...request, url },
      title: url || 'gRPC',
      isDirty: true
    })
  }

  const handleMessageChange = (message: string) => {
    updateTab(tab.id, {
      request: { ...request, message },
      isDirty: true
    })
  }

  const handleServiceChange = (serviceName: string) => {
    updateTab(tab.id, {
      request: { ...request, serviceName, methodName: '' },
      isDirty: true
    })
  }

  const handleMethodChange = (methodName: string) => {
    updateTab(tab.id, {
      request: { ...request, methodName },
      isDirty: true
    })
  }

  const handleSend = async () => {
    await sendGrpcRequest(tab.id, activeEnvironment)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend()
    }
  }

  const handleLoadProto = async () => {
    setProtoLoading(true)
    setProtoError(null)

    try {
      const result = await window.api.file.openFile([
        { name: 'Proto Files', extensions: ['proto'] }
      ])

      if (result) {
        const info = await window.api.grpc.loadProto(result.path)
        setProtoInfo(info)

        updateTab(tab.id, {
          request: {
            ...request,
            protoFile: result.path,
            serviceName: info.services.length > 0 ? info.services[0] : '',
            methodName:
              info.services.length > 0 && info.methods[info.services[0]]?.length > 0
                ? info.methods[info.services[0]][0]
                : ''
          },
          isDirty: true
        })
      }
    } catch (error) {
      setProtoError(error instanceof Error ? error.message : 'Failed to load proto file')
    } finally {
      setProtoLoading(false)
    }
  }

  const handleReflect = async () => {
    if (!request.url) return

    setProtoLoading(true)
    setProtoError(null)

    try {
      const info = await window.api.grpc.reflect(request.url)
      setProtoInfo(info)

      if (info.services.length > 0) {
        updateTab(tab.id, {
          request: {
            ...request,
            serviceName: info.services[0],
            methodName:
              info.methods[info.services[0]]?.length > 0
                ? info.methods[info.services[0]][0]
                : ''
          },
          isDirty: true
        })
      }
    } catch (error) {
      setProtoError(error instanceof Error ? error.message : 'Server reflection failed')
    } finally {
      setProtoLoading(false)
    }
  }

  const configTabItems: { id: ConfigTab; label: string; badge?: number; dot?: boolean }[] = [
    {
      id: 'metadata',
      label: 'Metadata',
      badge: request.metadata?.filter((m) => m.enabled).length
    },
    { id: 'auth', label: 'Auth' },
    { id: 'scripts', label: 'Scripts', dot: hasScripts }
  ]

  const availableMethods = request.serviceName && protoInfo?.methods[request.serviceName]
    ? protoInfo.methods[request.serviceName]
    : []

  return (
    <div className="flex flex-col border-b border-panel-border">
      {/* URL Bar */}
      <div className="flex items-center gap-2 p-3 bg-panel">
        <span className="text-green-400 font-semibold text-sm px-2">gRPC</span>
        <VariableHighlightInput
          value={request.url}
          onChange={handleUrlChange}
          onKeyDown={handleKeyDown}
          placeholder="localhost:50051 or grpcs://api.example.com"
          className="input flex-1"
          disabled={isLoading}
        />

        {/* Load Proto button */}
        <button
          className="btn btn-secondary px-3"
          onClick={handleLoadProto}
          disabled={protoLoading}
          title="Load .proto file"
        >
          {protoLoading ? <LoadingSpinner /> : <ProtoIcon />}
        </button>

        {/* Reflect button */}
        <button
          className="btn btn-secondary px-3"
          onClick={handleReflect}
          disabled={protoLoading || !request.url}
          title="Server Reflection"
        >
          <ReflectIcon />
        </button>

        {/* Save button */}
        <button
          className="btn btn-secondary px-4"
          onClick={() => setShowSaveModal(true)}
          title="Save to Collection"
          disabled={isLoading}
        >
          <SaveIcon />
        </button>

        {/* Send button */}
        <button
          className="btn btn-primary px-6"
          onClick={handleSend}
          disabled={isLoading || !request.serviceName || !request.methodName}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Invoking...
            </span>
          ) : (
            'Invoke'
          )}
        </button>
      </div>

      {/* Proto status / Service & Method selection */}
      <div className="flex items-center gap-3 px-3 py-2 bg-sidebar border-b border-panel-border">
        {protoError ? (
          <div className="text-red-400 text-sm flex-1">{protoError}</div>
        ) : request.protoFile ? (
          <>
            <div className="text-sm text-gray-400">
              Proto:{' '}
              <span className="text-gray-300">{request.protoFile.split('/').pop()}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Service:</label>
              <select
                className="input px-2 py-1 text-sm"
                value={request.serviceName || ''}
                onChange={(e) => handleServiceChange(e.target.value)}
                disabled={isLoading}
              >
                {protoInfo?.services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Method:</label>
              <select
                className="input px-2 py-1 text-sm"
                value={request.methodName || ''}
                onChange={(e) => handleMethodChange(e.target.value)}
                disabled={isLoading || !request.serviceName}
              >
                {availableMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500">
            Load a .proto file or use server reflection to discover services
          </div>
        )}
      </div>

      {/* Config tabs */}
      <div className="flex border-b border-panel-border bg-sidebar">
        {configTabItems.map((item) => (
          <button
            key={item.id}
            className={`tab ${configTab === item.id ? 'active' : ''}`}
            onClick={() => setConfigTab(item.id)}
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

      {/* Config content */}
      <div className="h-24 overflow-auto bg-panel border-b border-panel-border">
        {configTab === 'metadata' && <MetadataEditor tab={tab} />}
        {configTab === 'auth' && <AuthPanel tab={tab} />}
        {configTab === 'scripts' && <ScriptsPanel tab={tab} />}
      </div>

      {/* Message Editor */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-2 bg-sidebar border-b border-panel-border">
            <span className="text-sm font-semibold text-gray-300">Request Message (JSON)</span>
          </div>
          <div className="flex-1 min-h-[200px]">
            <CodeEditor
              value={request.message}
              onChange={handleMessageChange}
              language="json"
              placeholder="{}"
              height="100%"
            />
          </div>
        </div>
      </div>

      {/* Save to Collection Modal */}
      {showSaveModal && (
        <SaveToCollectionModal
          request={request}
          onClose={() => setShowSaveModal(false)}
          onSaved={(collectionRequestId) => {
            updateTab(tab.id, {
              collectionRequestId,
              isDirty: false
            })
          }}
        />
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  )
}

function ProtoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function ReflectIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}
