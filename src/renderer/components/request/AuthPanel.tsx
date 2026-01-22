import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import VariableHighlightInput from '../common/VariableHighlightInput'
import type { Tab, HttpRequest, AuthType, AuthConfig, OAuth2Config } from '../../../shared/types/models'

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
        <OAuth2Form
          oauth2={request.auth?.oauth2 || { grantType: 'authorization_code' }}
          onChange={(oauth2) => handleAuthUpdate({ oauth2 })}
        />
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

interface OAuth2FormProps {
  oauth2: OAuth2Config
  onChange: (value: OAuth2Config) => void
}

function OAuth2Form({ oauth2, onChange }: OAuth2FormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { activeEnvironment } = useEnvironmentStore()

  const grantType = oauth2.grantType || 'authorization_code'
  const isAuthCodeFlow = grantType === 'authorization_code'

  const handleGetToken = async () => {
    setIsLoading(true)
    setError(null)

    try {
      let response
      if (isAuthCodeFlow) {
        response = await window.api.oauth2.startAuthCodeFlow(oauth2, activeEnvironment || undefined)
      } else {
        response = await window.api.oauth2.clientCredentialsFlow(oauth2, activeEnvironment || undefined)
      }

      // Calculate expiration time
      const expiresAt = response.expiresIn
        ? Date.now() + response.expiresIn * 1000
        : undefined

      onChange({
        ...oauth2,
        accessToken: response.accessToken,
        tokenType: response.tokenType,
        refreshToken: response.refreshToken,
        expiresAt
      })
    } catch (err: any) {
      setError(err.message || 'Failed to obtain token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshToken = async () => {
    if (!oauth2.refreshToken) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await window.api.oauth2.refreshToken(oauth2, activeEnvironment || undefined)

      const expiresAt = response.expiresIn
        ? Date.now() + response.expiresIn * 1000
        : undefined

      onChange({
        ...oauth2,
        accessToken: response.accessToken,
        tokenType: response.tokenType,
        refreshToken: response.refreshToken || oauth2.refreshToken,
        expiresAt
      })
    } catch (err: any) {
      setError(err.message || 'Failed to refresh token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearToken = () => {
    onChange({
      ...oauth2,
      accessToken: undefined,
      tokenType: undefined,
      refreshToken: undefined,
      expiresAt: undefined
    })
    setError(null)
  }

  const isTokenExpired = oauth2.expiresAt ? Date.now() > oauth2.expiresAt : false
  const tokenExpiryLabel = oauth2.expiresAt
    ? isTokenExpired
      ? 'Expired'
      : `Expires ${new Date(oauth2.expiresAt).toLocaleString()}`
    : null

  return (
    <div className="space-y-4">
      {/* Grant Type */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Grant Type</label>
        <select
          className="select w-64"
          value={grantType}
          onChange={(e) =>
            onChange({
              ...oauth2,
              grantType: e.target.value as 'authorization_code' | 'client_credentials'
            })
          }
        >
          <option value="authorization_code">Authorization Code</option>
          <option value="client_credentials">Client Credentials</option>
        </select>
      </div>

      {/* PKCE checkbox (only for auth code flow) */}
      {isAuthCodeFlow && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="usePkce"
            checked={oauth2.usePkce || false}
            onChange={(e) => onChange({ ...oauth2, usePkce: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
          />
          <label htmlFor="usePkce" className="text-sm text-gray-300">
            Use PKCE (Proof Key for Code Exchange)
          </label>
        </div>
      )}

      {/* Authorization URL (only for auth code flow) */}
      {isAuthCodeFlow && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Authorization URL</label>
          <VariableHighlightInput
            className="input w-full max-w-lg"
            placeholder="https://auth.example.com/authorize"
            value={oauth2.authUrl || ''}
            onChange={(value) => onChange({ ...oauth2, authUrl: value })}
          />
        </div>
      )}

      {/* Token URL */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Token URL</label>
        <VariableHighlightInput
          className="input w-full max-w-lg"
          placeholder="https://auth.example.com/oauth/token"
          value={oauth2.tokenUrl || ''}
          onChange={(value) => onChange({ ...oauth2, tokenUrl: value })}
        />
      </div>

      {/* Client ID */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Client ID</label>
        <VariableHighlightInput
          className="input w-full max-w-md"
          placeholder="{{CLIENT_ID}}"
          value={oauth2.clientId || ''}
          onChange={(value) => onChange({ ...oauth2, clientId: value })}
        />
      </div>

      {/* Client Secret */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Client Secret {isAuthCodeFlow && <span className="text-gray-500">(optional)</span>}
        </label>
        <VariableHighlightInput
          className="input w-full max-w-md"
          placeholder="{{CLIENT_SECRET}}"
          value={oauth2.clientSecret || ''}
          onChange={(value) => onChange({ ...oauth2, clientSecret: value })}
        />
      </div>

      {/* Scope */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Scope</label>
        <VariableHighlightInput
          className="input w-full max-w-md"
          placeholder="openid profile email"
          value={oauth2.scope || ''}
          onChange={(value) => onChange({ ...oauth2, scope: value })}
        />
      </div>

      {/* Audience */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Audience <span className="text-gray-500">(optional)</span>
        </label>
        <VariableHighlightInput
          className="input w-full max-w-md"
          placeholder="https://api.example.com"
          value={oauth2.audience || ''}
          onChange={(value) => onChange({ ...oauth2, audience: value })}
        />
      </div>

      {/* Token Section */}
      <div className="border-t border-gray-700 pt-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            className="btn btn-primary"
            onClick={handleGetToken}
            disabled={isLoading}
          >
            {isLoading ? 'Getting Token...' : 'Get New Token'}
          </button>

          {oauth2.refreshToken && (
            <button
              className="btn btn-secondary"
              onClick={handleRefreshToken}
              disabled={isLoading}
            >
              Refresh Token
            </button>
          )}

          {oauth2.accessToken && (
            <button
              className="btn btn-secondary text-red-400 hover:text-red-300"
              onClick={handleClearToken}
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="text-red-400 text-sm mb-3 p-2 bg-red-400/10 rounded">
            {error}
          </div>
        )}

        {oauth2.accessToken && (
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Access Token</span>
              {tokenExpiryLabel && (
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    isTokenExpired
                      ? 'bg-red-400/20 text-red-400'
                      : 'bg-green-400/20 text-green-400'
                  }`}
                >
                  {tokenExpiryLabel}
                </span>
              )}
            </div>
            <code className="text-sm text-gray-300 break-all block">
              {oauth2.accessToken.length > 100
                ? `${oauth2.accessToken.substring(0, 100)}...`
                : oauth2.accessToken}
            </code>
            {oauth2.tokenType && (
              <div className="mt-2 text-xs text-gray-500">
                Type: {oauth2.tokenType}
              </div>
            )}
            {oauth2.refreshToken && (
              <div className="mt-1 text-xs text-gray-500">
                Refresh token available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
