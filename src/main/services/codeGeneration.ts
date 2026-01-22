import type { HttpRequest, KeyValuePair, AuthConfig } from '../../shared/types/models'

export type CodeLanguage = 'curl' | 'javascript-fetch' | 'javascript-axios' | 'python-requests' | 'go' | 'php-curl'

interface CodeGenerationOptions {
  request: HttpRequest
  includeComments?: boolean
}

export function generateCode(language: CodeLanguage, options: CodeGenerationOptions): string {
  const { request, includeComments = false } = options

  switch (language) {
    case 'curl':
      return generateCurl(request, includeComments)
    case 'javascript-fetch':
      return generateJavaScriptFetch(request, includeComments)
    case 'javascript-axios':
      return generateJavaScriptAxios(request, includeComments)
    case 'python-requests':
      return generatePythonRequests(request, includeComments)
    case 'go':
      return generateGo(request, includeComments)
    case 'php-curl':
      return generatePhpCurl(request, includeComments)
    default:
      throw new Error(`Unknown language: ${language}`)
  }
}

// Helper to get enabled headers
function getEnabledHeaders(headers: KeyValuePair[]): KeyValuePair[] {
  return headers.filter((h) => h.enabled && h.key.trim())
}

// Helper to get enabled params
function getEnabledParams(params: KeyValuePair[]): KeyValuePair[] {
  return params.filter((p) => p.enabled && p.key.trim())
}

// Helper to build URL with query params
function buildUrl(url: string, params: KeyValuePair[]): string {
  const enabledParams = getEnabledParams(params)
  if (enabledParams.length === 0) return url

  const queryString = enabledParams
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&')

  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`
}

// Helper to get auth headers
function getAuthHeaders(auth: AuthConfig): Record<string, string> {
  const headers: Record<string, string> = {}

  if (auth.type === 'basic' && auth.basic) {
    const credentials = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64')
    headers['Authorization'] = `Basic ${credentials}`
  } else if (auth.type === 'bearer' && auth.bearer) {
    headers['Authorization'] = `Bearer ${auth.bearer.token}`
  } else if (auth.type === 'api-key' && auth.apiKey && auth.apiKey.addTo === 'header') {
    headers[auth.apiKey.key] = auth.apiKey.value
  }

  return headers
}

// cURL generation
function generateCurl(request: HttpRequest, includeComments: boolean): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`# ${request.name || 'HTTP Request'}`)
  }

  const fullUrl = buildUrl(request.url, request.params)
  lines.push(`curl -X ${request.method} '${fullUrl}'`)

  // Add headers
  const headers = getEnabledHeaders(request.headers)
  const authHeaders = getAuthHeaders(request.auth)

  // Combine auth headers with regular headers
  for (const [key, value] of Object.entries(authHeaders)) {
    lines.push(`  -H '${key}: ${value}'`)
  }

  for (const header of headers) {
    lines.push(`  -H '${header.key}: ${header.value}'`)
  }

  // Add body
  if (request.body.type !== 'none' && request.body.content) {
    if (request.body.type === 'json') {
      lines.push(`  -H 'Content-Type: application/json'`)
      lines.push(`  -d '${request.body.content.replace(/'/g, "\\'")}'`)
    } else if (request.body.type === 'form-data' && request.body.formData) {
      for (const field of request.body.formData.filter((f) => f.enabled)) {
        lines.push(`  -F '${field.key}=${field.value}'`)
      }
    } else if (request.body.type === 'x-www-form-urlencoded') {
      lines.push(`  -H 'Content-Type: application/x-www-form-urlencoded'`)
      lines.push(`  -d '${request.body.content}'`)
    } else {
      lines.push(`  -d '${request.body.content.replace(/'/g, "\\'")}'`)
    }
  }

  return lines.join(' \\\n')
}

// JavaScript fetch generation
function generateJavaScriptFetch(request: HttpRequest, includeComments: boolean): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`// ${request.name || 'HTTP Request'}`)
  }

  const fullUrl = buildUrl(request.url, request.params)
  const headers = getEnabledHeaders(request.headers)
  const authHeaders = getAuthHeaders(request.auth)
  const allHeaders = { ...authHeaders }

  for (const header of headers) {
    allHeaders[header.key] = header.value
  }

  // Add content-type if needed
  if (request.body.type === 'json') {
    allHeaders['Content-Type'] = 'application/json'
  } else if (request.body.type === 'x-www-form-urlencoded') {
    allHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  const options: string[] = []
  options.push(`  method: '${request.method}'`)

  if (Object.keys(allHeaders).length > 0) {
    const headersStr = JSON.stringify(allHeaders, null, 4).replace(/\n/g, '\n  ')
    options.push(`  headers: ${headersStr}`)
  }

  if (request.body.type !== 'none' && request.body.content) {
    if (request.body.type === 'json') {
      options.push(`  body: JSON.stringify(${request.body.content})`)
    } else {
      options.push(`  body: ${JSON.stringify(request.body.content)}`)
    }
  }

  lines.push(`fetch('${fullUrl}', {`)
  lines.push(options.join(',\n'))
  lines.push(`})`)
  lines.push(`  .then(response => response.json())`)
  lines.push(`  .then(data => console.log(data))`)
  lines.push(`  .catch(error => console.error('Error:', error));`)

  return lines.join('\n')
}

// JavaScript axios generation
function generateJavaScriptAxios(request: HttpRequest, includeComments: boolean): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`// ${request.name || 'HTTP Request'}`)
  }

  lines.push(`const axios = require('axios');`)
  lines.push('')

  const fullUrl = buildUrl(request.url, request.params)
  const headers = getEnabledHeaders(request.headers)
  const authHeaders = getAuthHeaders(request.auth)
  const allHeaders = { ...authHeaders }

  for (const header of headers) {
    allHeaders[header.key] = header.value
  }

  if (request.body.type === 'json') {
    allHeaders['Content-Type'] = 'application/json'
  } else if (request.body.type === 'x-www-form-urlencoded') {
    allHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  const config: string[] = []
  config.push(`  method: '${request.method.toLowerCase()}'`)
  config.push(`  url: '${fullUrl}'`)

  if (Object.keys(allHeaders).length > 0) {
    const headersStr = JSON.stringify(allHeaders, null, 4).replace(/\n/g, '\n  ')
    config.push(`  headers: ${headersStr}`)
  }

  if (request.body.type !== 'none' && request.body.content) {
    if (request.body.type === 'json') {
      config.push(`  data: ${request.body.content}`)
    } else {
      config.push(`  data: ${JSON.stringify(request.body.content)}`)
    }
  }

  lines.push(`axios({`)
  lines.push(config.join(',\n'))
  lines.push(`})`)
  lines.push(`  .then(response => console.log(response.data))`)
  lines.push(`  .catch(error => console.error('Error:', error));`)

  return lines.join('\n')
}

// Python requests generation
function generatePythonRequests(request: HttpRequest, includeComments: boolean): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`# ${request.name || 'HTTP Request'}`)
  }

  lines.push(`import requests`)
  lines.push('')

  const fullUrl = buildUrl(request.url, request.params)
  const headers = getEnabledHeaders(request.headers)
  const authHeaders = getAuthHeaders(request.auth)
  const allHeaders = { ...authHeaders }

  for (const header of headers) {
    allHeaders[header.key] = header.value
  }

  lines.push(`url = "${fullUrl}"`)

  if (Object.keys(allHeaders).length > 0) {
    lines.push('')
    lines.push(`headers = {`)
    for (const [key, value] of Object.entries(allHeaders)) {
      lines.push(`    "${key}": "${value}",`)
    }
    lines.push(`}`)
  }

  if (request.body.type !== 'none' && request.body.content) {
    lines.push('')
    if (request.body.type === 'json') {
      lines.push(`payload = ${request.body.content}`)
    } else {
      lines.push(`payload = """${request.body.content}"""`)
    }
  }

  lines.push('')

  const args: string[] = ['url']
  if (Object.keys(allHeaders).length > 0) {
    args.push('headers=headers')
  }
  if (request.body.type !== 'none' && request.body.content) {
    if (request.body.type === 'json') {
      args.push('json=payload')
    } else {
      args.push('data=payload')
    }
  }

  lines.push(`response = requests.${request.method.toLowerCase()}(${args.join(', ')})`)
  lines.push('')
  lines.push(`print(response.status_code)`)
  lines.push(`print(response.json())`)

  return lines.join('\n')
}

// Go http generation
function generateGo(request: HttpRequest, includeComments: boolean): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`// ${request.name || 'HTTP Request'}`)
  }

  lines.push(`package main`)
  lines.push('')
  lines.push(`import (`)
  lines.push(`    "fmt"`)
  lines.push(`    "io"`)
  lines.push(`    "net/http"`)
  if (request.body.type !== 'none' && request.body.content) {
    lines.push(`    "strings"`)
  }
  lines.push(`)`)
  lines.push('')
  lines.push(`func main() {`)

  const fullUrl = buildUrl(request.url, request.params)
  const headers = getEnabledHeaders(request.headers)
  const authHeaders = getAuthHeaders(request.auth)

  if (request.body.type !== 'none' && request.body.content) {
    const bodyContent = request.body.content.replace(/"/g, '\\"').replace(/\n/g, '\\n')
    lines.push(`    body := strings.NewReader("${bodyContent}")`)
    lines.push(`    req, err := http.NewRequest("${request.method}", "${fullUrl}", body)`)
  } else {
    lines.push(`    req, err := http.NewRequest("${request.method}", "${fullUrl}", nil)`)
  }

  lines.push(`    if err != nil {`)
  lines.push(`        panic(err)`)
  lines.push(`    }`)
  lines.push('')

  // Add headers
  for (const [key, value] of Object.entries(authHeaders)) {
    lines.push(`    req.Header.Set("${key}", "${value}")`)
  }
  for (const header of headers) {
    lines.push(`    req.Header.Set("${header.key}", "${header.value}")`)
  }
  if (request.body.type === 'json') {
    lines.push(`    req.Header.Set("Content-Type", "application/json")`)
  } else if (request.body.type === 'x-www-form-urlencoded') {
    lines.push(`    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")`)
  }

  lines.push('')
  lines.push(`    client := &http.Client{}`)
  lines.push(`    resp, err := client.Do(req)`)
  lines.push(`    if err != nil {`)
  lines.push(`        panic(err)`)
  lines.push(`    }`)
  lines.push(`    defer resp.Body.Close()`)
  lines.push('')
  lines.push(`    bodyBytes, _ := io.ReadAll(resp.Body)`)
  lines.push(`    fmt.Println(string(bodyBytes))`)
  lines.push(`}`)

  return lines.join('\n')
}

// PHP cURL generation
function generatePhpCurl(request: HttpRequest, includeComments: boolean): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`<?php`)
    lines.push(`// ${request.name || 'HTTP Request'}`)
  } else {
    lines.push(`<?php`)
  }
  lines.push('')

  const fullUrl = buildUrl(request.url, request.params)
  const headers = getEnabledHeaders(request.headers)
  const authHeaders = getAuthHeaders(request.auth)

  lines.push(`$curl = curl_init();`)
  lines.push('')
  lines.push(`curl_setopt_array($curl, [`)
  lines.push(`    CURLOPT_URL => "${fullUrl}",`)
  lines.push(`    CURLOPT_RETURNTRANSFER => true,`)
  lines.push(`    CURLOPT_CUSTOMREQUEST => "${request.method}",`)

  // Build headers array
  const allHeaders: string[] = []
  for (const [key, value] of Object.entries(authHeaders)) {
    allHeaders.push(`"${key}: ${value}"`)
  }
  for (const header of headers) {
    allHeaders.push(`"${header.key}: ${header.value}"`)
  }
  if (request.body.type === 'json') {
    allHeaders.push(`"Content-Type: application/json"`)
  } else if (request.body.type === 'x-www-form-urlencoded') {
    allHeaders.push(`"Content-Type: application/x-www-form-urlencoded"`)
  }

  if (allHeaders.length > 0) {
    lines.push(`    CURLOPT_HTTPHEADER => [`)
    for (const header of allHeaders) {
      lines.push(`        ${header},`)
    }
    lines.push(`    ],`)
  }

  if (request.body.type !== 'none' && request.body.content) {
    const bodyContent = request.body.content.replace(/"/g, '\\"').replace(/\n/g, '\\n')
    lines.push(`    CURLOPT_POSTFIELDS => "${bodyContent}",`)
  }

  lines.push(`]);`)
  lines.push('')
  lines.push(`$response = curl_exec($curl);`)
  lines.push(`$error = curl_error($curl);`)
  lines.push('')
  lines.push(`curl_close($curl);`)
  lines.push('')
  lines.push(`if ($error) {`)
  lines.push(`    echo "Error: " . $error;`)
  lines.push(`} else {`)
  lines.push(`    echo $response;`)
  lines.push(`}`)

  return lines.join('\n')
}

export const codeGenerationService = {
  generateCode,
  supportedLanguages: [
    { id: 'curl', name: 'cURL' },
    { id: 'javascript-fetch', name: 'JavaScript (Fetch)' },
    { id: 'javascript-axios', name: 'JavaScript (Axios)' },
    { id: 'python-requests', name: 'Python (Requests)' },
    { id: 'go', name: 'Go' },
    { id: 'php-curl', name: 'PHP (cURL)' }
  ] as const
}
