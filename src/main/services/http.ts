import axios, { AxiosResponse, CancelTokenSource } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import type {
  Request,
  HttpRequest,
  Environment,
  Response,
  KeyValuePair
} from '../../shared/types/models'

// Store cancel tokens for in-flight requests
const cancelTokens = new Map<string, CancelTokenSource>()

function interpolateVariables(text: string, environment?: Environment): string {
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

function buildHeaders(
  headers: KeyValuePair[],
  environment?: Environment
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const header of headers) {
    if (header.enabled) {
      result[interpolateVariables(header.key, environment)] = interpolateVariables(
        header.value,
        environment
      )
    }
  }
  return result
}

function buildParams(
  params: KeyValuePair[],
  environment?: Environment
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const param of params) {
    if (param.enabled) {
      result[interpolateVariables(param.key, environment)] = interpolateVariables(
        param.value,
        environment
      )
    }
  }
  return result
}

function buildRequestBody(request: HttpRequest, environment?: Environment): any {
  const { body } = request
  if (body.type === 'none') return undefined

  if (body.type === 'json' || body.type === 'raw') {
    return interpolateVariables(body.content, environment)
  }

  if (body.type === 'form-data' || body.type === 'x-www-form-urlencoded') {
    const formData: Record<string, string> = {}
    for (const item of body.formData || []) {
      if (item.enabled) {
        formData[interpolateVariables(item.key, environment)] = interpolateVariables(
          item.value,
          environment
        )
      }
    }
    return body.type === 'form-data' ? formData : new URLSearchParams(formData).toString()
  }

  return body.content
}

function applyAuth(request: HttpRequest, headers: Record<string, string>): void {
  const { auth } = request

  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        const credentials = Buffer.from(
          `${auth.basic.username}:${auth.basic.password}`
        ).toString('base64')
        headers['Authorization'] = `Basic ${credentials}`
      }
      break
    case 'bearer':
      if (auth.bearer) {
        headers['Authorization'] = `Bearer ${auth.bearer.token}`
      }
      break
    case 'api-key':
      if (auth.apiKey && auth.apiKey.addTo === 'header') {
        headers[auth.apiKey.key] = auth.apiKey.value
      }
      break
  }
}

export const httpService = {
  async send(request: Request, environment?: Environment): Promise<Response> {
    if (request.type !== 'http') {
      throw new Error('Invalid request type')
    }

    const httpRequest = request as HttpRequest
    const cancelSource = axios.CancelToken.source()
    cancelTokens.set(httpRequest.id, cancelSource)

    const url = interpolateVariables(httpRequest.url, environment)
    const headers = buildHeaders(httpRequest.headers, environment)
    const params = buildParams(httpRequest.params, environment)

    // Apply authentication
    applyAuth(httpRequest, headers)

    // Handle API key in query params
    if (httpRequest.auth.type === 'api-key' && httpRequest.auth.apiKey?.addTo === 'query') {
      params[httpRequest.auth.apiKey.key] = httpRequest.auth.apiKey.value
    }

    // Set content-type for body types
    if (httpRequest.body.type === 'json') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    } else if (httpRequest.body.type === 'x-www-form-urlencoded') {
      headers['Content-Type'] =
        headers['Content-Type'] || 'application/x-www-form-urlencoded'
    }

    const startTime = Date.now()

    try {
      const response: AxiosResponse = await axios({
        method: httpRequest.method.toLowerCase(),
        url,
        headers,
        params,
        data: buildRequestBody(httpRequest, environment),
        cancelToken: cancelSource.token,
        timeout: 30000,
        validateStatus: () => true // Don't throw on any status code
      })

      const endTime = Date.now()
      const responseBody =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data, null, 2)

      return {
        id: uuidv4(),
        requestId: httpRequest.id,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body: responseBody,
        size: Buffer.byteLength(responseBody, 'utf-8'),
        time: endTime - startTime,
        timestamp: new Date().toISOString()
      }
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled')
      }

      // Network error or timeout
      return {
        id: uuidv4(),
        requestId: httpRequest.id,
        status: 0,
        statusText: error.message || 'Network Error',
        headers: {},
        body: error.message || 'Network Error',
        size: 0,
        time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    } finally {
      cancelTokens.delete(httpRequest.id)
    }
  },

  cancel(requestId: string): void {
    const cancelSource = cancelTokens.get(requestId)
    if (cancelSource) {
      cancelSource.cancel('Request cancelled by user')
      cancelTokens.delete(requestId)
    }
  }
}
