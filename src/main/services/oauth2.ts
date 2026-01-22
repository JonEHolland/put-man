import { createServer, Server, IncomingMessage, ServerResponse } from 'http'
import { shell } from 'electron'
import { randomBytes, createHash } from 'crypto'
import axios from 'axios'
import type { OAuth2Config, OAuth2TokenResponse, Environment } from '../../shared/types/models'

// Generate a random code verifier for PKCE
function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Generate code challenge from verifier using S256
function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest('base64')
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Interpolate environment variables in a string
function interpolateVariables(text: string | undefined, environment?: Environment): string {
  if (!text) return ''
  if (!environment) return text

  let result = text
  for (const variable of environment.variables) {
    if (variable.enabled) {
      const pattern = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g')
      result = result.replace(pattern, variable.value)
    }
  }
  return result
}

// HTML templates for callback responses
const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #4ade80;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .icon svg {
      width: 40px;
      height: 40px;
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg fill="none" stroke="#fff" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1>Authorization Successful</h1>
    <p>You can close this window and return to PutMan.</p>
  </div>
</body>
</html>
`

const errorHtml = (error: string, description?: string) => `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .icon svg {
      width: 40px;
      height: 40px;
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      color: #94a3b8;
    }
    .error-code {
      font-family: monospace;
      background: rgba(255,255,255,0.1);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      margin-top: 1rem;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg fill="none" stroke="#fff" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </div>
    <h1>Authorization Failed</h1>
    <p>${description || 'An error occurred during authorization.'}</p>
    <div class="error-code">${error}</div>
  </div>
</body>
</html>
`

interface CallbackResult {
  code?: string
  error?: string
  errorDescription?: string
  state?: string
}

// Create an ephemeral HTTP server to receive OAuth callback
function createCallbackServer(expectedState: string): Promise<{ server: Server; port: number; waitForCallback: () => Promise<CallbackResult> }> {
  return new Promise((resolve, reject) => {
    let callbackResolve: (result: CallbackResult) => void
    let callbackReject: (error: Error) => void

    const callbackPromise = new Promise<CallbackResult>((res, rej) => {
      callbackResolve = res
      callbackReject = rej
    })

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', `http://localhost`)

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')
        const state = url.searchParams.get('state')

        // Verify state to prevent CSRF
        if (state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(errorHtml('invalid_state', 'State parameter mismatch. This may be a CSRF attack.'))
          callbackReject(new Error('State parameter mismatch'))
          return
        }

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(errorHtml(error, errorDescription || undefined))
          callbackResolve({ error, errorDescription: errorDescription || undefined, state: state || undefined })
        } else if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(successHtml)
          callbackResolve({ code, state: state || undefined })
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(errorHtml('missing_code', 'No authorization code received.'))
          callbackReject(new Error('No authorization code received'))
        }

        // Close server after handling callback
        setTimeout(() => server.close(), 1000)
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      }
    })

    // Listen on a random available port
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        resolve({
          server,
          port: address.port,
          waitForCallback: () => callbackPromise
        })
      } else {
        reject(new Error('Failed to get server address'))
      }
    })

    server.on('error', reject)

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close()
      callbackReject(new Error('Authorization timeout'))
    }, 5 * 60 * 1000)
  })
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(
  config: OAuth2Config,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
  environment?: Environment
): Promise<OAuth2TokenResponse> {
  const tokenUrl = interpolateVariables(config.tokenUrl, environment)
  const clientId = interpolateVariables(config.clientId, environment)
  const clientSecret = interpolateVariables(config.clientSecret, environment)

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId
  })

  if (clientSecret) {
    params.append('client_secret', clientSecret)
  }

  if (codeVerifier) {
    params.append('code_verifier', codeVerifier)
  }

  const response = await axios.post(tokenUrl, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  return {
    accessToken: response.data.access_token,
    tokenType: response.data.token_type || 'Bearer',
    expiresIn: response.data.expires_in,
    refreshToken: response.data.refresh_token,
    scope: response.data.scope
  }
}

export const oauth2Service = {
  // Authorization Code flow (with optional PKCE)
  async startAuthCodeFlow(config: OAuth2Config, environment?: Environment): Promise<OAuth2TokenResponse> {
    const authUrl = interpolateVariables(config.authUrl, environment)
    const clientId = interpolateVariables(config.clientId, environment)
    const scope = interpolateVariables(config.scope, environment)
    const audience = interpolateVariables(config.audience, environment)

    if (!authUrl) throw new Error('Authorization URL is required')
    if (!config.tokenUrl) throw new Error('Token URL is required')
    if (!clientId) throw new Error('Client ID is required')

    // Generate state for CSRF protection
    const state = randomBytes(16).toString('hex')

    // Generate PKCE values if enabled
    let codeVerifier: string | undefined
    let codeChallenge: string | undefined
    if (config.usePkce) {
      codeVerifier = generateCodeVerifier()
      codeChallenge = generateCodeChallenge(codeVerifier)
    }

    // Start callback server
    const { server, port, waitForCallback } = await createCallbackServer(state)
    const redirectUri = `http://127.0.0.1:${port}/callback`

    try {
      // Build authorization URL
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state
      })

      if (scope) {
        authParams.append('scope', scope)
      }

      if (audience) {
        authParams.append('audience', audience)
      }

      if (codeChallenge) {
        authParams.append('code_challenge', codeChallenge)
        authParams.append('code_challenge_method', 'S256')
      }

      const fullAuthUrl = `${authUrl}?${authParams.toString()}`

      // Open browser for user authentication
      await shell.openExternal(fullAuthUrl)

      // Wait for callback
      const result = await waitForCallback()

      if (result.error) {
        throw new Error(result.errorDescription || result.error)
      }

      if (!result.code) {
        throw new Error('No authorization code received')
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(
        config,
        result.code,
        redirectUri,
        codeVerifier,
        environment
      )

      return tokens
    } finally {
      server.close()
    }
  },

  // Client Credentials flow
  async clientCredentialsFlow(config: OAuth2Config, environment?: Environment): Promise<OAuth2TokenResponse> {
    const tokenUrl = interpolateVariables(config.tokenUrl, environment)
    const clientId = interpolateVariables(config.clientId, environment)
    const clientSecret = interpolateVariables(config.clientSecret, environment)
    const scope = interpolateVariables(config.scope, environment)
    const audience = interpolateVariables(config.audience, environment)

    if (!tokenUrl) throw new Error('Token URL is required')
    if (!clientId) throw new Error('Client ID is required')
    if (!clientSecret) throw new Error('Client Secret is required for Client Credentials flow')

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })

    if (scope) {
      params.append('scope', scope)
    }

    if (audience) {
      params.append('audience', audience)
    }

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type || 'Bearer',
      expiresIn: response.data.expires_in,
      refreshToken: response.data.refresh_token,
      scope: response.data.scope
    }
  },

  // Refresh Token flow
  async refreshToken(config: OAuth2Config, environment?: Environment): Promise<OAuth2TokenResponse> {
    const tokenUrl = interpolateVariables(config.tokenUrl, environment)
    const clientId = interpolateVariables(config.clientId, environment)
    const clientSecret = interpolateVariables(config.clientSecret, environment)
    const refreshToken = interpolateVariables(config.refreshToken, environment)

    if (!tokenUrl) throw new Error('Token URL is required')
    if (!refreshToken) throw new Error('Refresh token is required')

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })

    if (clientId) {
      params.append('client_id', clientId)
    }

    if (clientSecret) {
      params.append('client_secret', clientSecret)
    }

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type || 'Bearer',
      expiresIn: response.data.expires_in,
      refreshToken: response.data.refresh_token || refreshToken, // Keep old refresh token if not returned
      scope: response.data.scope
    }
  }
}
