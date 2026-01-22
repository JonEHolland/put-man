import { useAppStore } from '../../stores/appStore'
import type { Tab, HttpRequest, AuthType, AuthConfig } from '../../../shared/types/models'

const AUTH_TYPES: { id: AuthType; label: string }[] = [
  { id: 'none', label: 'No Auth' },
  { id: 'basic', label: 'Basic Auth' },
  { id: 'bearer', label: 'Bearer Token' },
  { id: 'api-key', label: 'API Key' },
  { id: 'oauth2', label: 'OAuth 2.0' },
  { id: 'aws-sig-v4', label: 'AWS Signature V4' }
]

interface AuthPanelProps {
  tab: Tab
}

export default function AuthPanel({ tab }: AuthPanelProps) {
  const { updateTab } = useAppStore()
  const request = tab.request as HttpRequest

  const authType = request.auth?.type || 'none'

  const handleTypeChange = (type: AuthType) => {
    updateTab(tab.id, {
      request: {
        ...request,
        auth: { ...request.auth, type }
      },
      isDirty: true
    })
  }

  const handleAuthUpdate = (updates: Partial<AuthConfig>) => {
    updateTab(tab.id, {
      request: {
        ...request,
        auth: { ...request.auth, ...updates }
      },
      isDirty: true
    })
  }

  return (
    <div className="p-3">
      {/* Auth type selector */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Type</label>
        <select
          className="select w-48"
          value={authType}
          onChange={(e) => handleTypeChange(e.target.value as AuthType)}
        >
          {AUTH_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Auth configuration */}
      {authType === 'none' && (
        <div className="text-gray-500 text-sm">
          This request does not use any authorization.
        </div>
      )}

      {authType === 'basic' && (
        <BasicAuthForm
          username={request.auth?.basic?.username || ''}
          password={request.auth?.basic?.password || ''}
          onChange={(basic) => handleAuthUpdate({ basic })}
        />
      )}

      {authType === 'bearer' && (
        <BearerTokenForm
          token={request.auth?.bearer?.token || ''}
          onChange={(bearer) => handleAuthUpdate({ bearer })}
        />
      )}

      {authType === 'api-key' && (
        <ApiKeyForm
          apiKey={request.auth?.apiKey || { key: '', value: '', addTo: 'header' }}
          onChange={(apiKey) => handleAuthUpdate({ apiKey })}
        />
      )}

      {authType === 'oauth2' && (
        <div className="text-gray-500 text-sm">
          OAuth 2.0 configuration will be available in a future update.
        </div>
      )}

      {authType === 'aws-sig-v4' && (
        <div className="text-gray-500 text-sm">
          AWS Signature V4 configuration will be available in a future update.
        </div>
      )}
    </div>
  )
}

interface BasicAuthFormProps {
  username: string
  password: string
  onChange: (value: { username: string; password: string }) => void
}

function BasicAuthForm({ username, password, onChange }: BasicAuthFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Username</label>
        <input
          type="text"
          className="input w-full max-w-md"
          value={username}
          onChange={(e) => onChange({ username: e.target.value, password })}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Password</label>
        <input
          type="password"
          className="input w-full max-w-md"
          value={password}
          onChange={(e) => onChange({ username, password: e.target.value })}
        />
      </div>
    </div>
  )
}

interface BearerTokenFormProps {
  token: string
  onChange: (value: { token: string }) => void
}

function BearerTokenForm({ token, onChange }: BearerTokenFormProps) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">Token</label>
      <input
        type="text"
        className="input w-full max-w-md"
        placeholder="Enter bearer token"
        value={token}
        onChange={(e) => onChange({ token: e.target.value })}
      />
    </div>
  )
}

interface ApiKeyFormProps {
  apiKey: { key: string; value: string; addTo: 'header' | 'query' }
  onChange: (value: { key: string; value: string; addTo: 'header' | 'query' }) => void
}

function ApiKeyForm({ apiKey, onChange }: ApiKeyFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Key</label>
        <input
          type="text"
          className="input w-full max-w-md"
          placeholder="X-API-Key"
          value={apiKey.key}
          onChange={(e) => onChange({ ...apiKey, key: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Value</label>
        <input
          type="text"
          className="input w-full max-w-md"
          placeholder="Enter API key"
          value={apiKey.value}
          onChange={(e) => onChange({ ...apiKey, value: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Add to</label>
        <select
          className="select"
          value={apiKey.addTo}
          onChange={(e) => onChange({ ...apiKey, addTo: e.target.value as 'header' | 'query' })}
        >
          <option value="header">Header</option>
          <option value="query">Query Params</option>
        </select>
      </div>
    </div>
  )
}
