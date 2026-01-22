import axios, { AxiosResponse, CancelTokenSource } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import type {
  Request,
  HttpRequest,
  Environment,
  Response,
  KeyValuePair,
  ScriptResult
} from '../../shared/types/models'
import { scriptRunner } from './scriptRunner'

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

function applyAuth(request: HttpRequest, headers: Record<string, string>, environment?: Environment): void {
  const { auth } = request

  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        const username = interpolateVariables(auth.basic.username, environment)
        const password = interpolateVariables(auth.basic.password, environment)
        const credentials = Buffer.from(`${username}:${password}`).toString('base64')
        headers['Authorization'] = `Basic ${credentials}`
      }
      break
    case 'bearer':
      if (auth.bearer) {
        const token = interpolateVariables(auth.bearer.token, environment)
        headers['Authorization'] = `Bearer ${token}`
      }
      break
    case 'api-key':
      if (auth.apiKey && auth.apiKey.addTo === 'header') {
        const key = interpolateVariables(auth.apiKey.key, environment)
        const value = interpolateVariables(auth.apiKey.value, environment)
        headers[key] = value
      }
      break
    case 'oauth2':
      if (auth.oauth2?.accessToken) {
        const tokenType = auth.oauth2.tokenType || 'Bearer'
        const token = interpolateVariables(auth.oauth2.accessToken, environment)
        headers['Authorization'] = `${tokenType} ${token}`
      }
      break
  }
}

function convertScriptResult(result: Awaited<ReturnType<typeof scriptRunner.runPreRequestScript>>): ScriptResult {
  return {
    success: result.success,
    error: result.error,
    consoleLogs: result.consoleLogs,
    environmentUpdates: Object.fromEntries(result.environmentUpdates),
    testResults: result.testResults,
    duration: result.duration
  }
}

function applyEnvironmentUpdates(
  environment: Environment | undefined,
  updates: Map<string, string>
): Environment | undefined {
  if (updates.size === 0 || !environment) {
    return environment
  }

  // Create a copy of the environment with updated variables
  const updatedVariables = [...environment.variables]

  for (const [key, value] of updates) {
    const existingIndex = updatedVariables.findIndex(v => v.key === key)
    if (existingIndex >= 0) {
      // Update existing variable
      updatedVariables[existingIndex] = {
        ...updatedVariables[existingIndex],
        value,
        enabled: value !== '' // Disable if value is empty (unset)
      }
    } else if (value !== '') {
      // Add new variable
      updatedVariables.push({
        id: uuidv4(),
        key,
        value,
        enabled: true
      })
    }
  }

  return {
    ...environment,
    variables: updatedVariables
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

    let preRequestScriptResult: ScriptResult | undefined
    let workingEnvironment = environment

    // Run pre-request script if present
    if (httpRequest.preRequestScript?.trim()) {
      const result = await scriptRunner.runPreRequestScript(
        httpRequest.preRequestScript,
        httpRequest,
        environment
      )
      preRequestScriptResult = convertScriptResult(result)

      // Apply environment updates from script
      if (result.environmentUpdates.size > 0) {
        workingEnvironment = applyEnvironmentUpdates(environment, result.environmentUpdates)
      }

      // If script failed, return early with error response
      if (!result.success) {
        return {
          id: uuidv4(),
          requestId: httpRequest.id,
          status: 0,
          statusText: 'Pre-request script error',
          headers: {},
          body: `Pre-request script error: ${result.error}`,
          size: 0,
          time: 0,
          timestamp: new Date().toISOString(),
          preRequestScriptResult
        }
      }
    }

    const url = interpolateVariables(httpRequest.url, workingEnvironment)
    const headers = buildHeaders(httpRequest.headers, workingEnvironment)
    const params = buildParams(httpRequest.params, workingEnvironment)

    // Apply authentication
    applyAuth(httpRequest, headers, workingEnvironment)

    // Handle API key in query params
    if (httpRequest.auth.type === 'api-key' && httpRequest.auth.apiKey?.addTo === 'query') {
      const key = interpolateVariables(httpRequest.auth.apiKey.key, workingEnvironment)
      const value = interpolateVariables(httpRequest.auth.apiKey.value, workingEnvironment)
      params[key] = value
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
      const axiosResponse: AxiosResponse = await axios({
        method: httpRequest.method.toLowerCase(),
        url,
        headers,
        params,
        data: buildRequestBody(httpRequest, workingEnvironment),
        cancelToken: cancelSource.token,
        timeout: 30000,
        validateStatus: () => true // Don't throw on any status code
      })

      const endTime = Date.now()
      const responseBody =
        typeof axiosResponse.data === 'string'
          ? axiosResponse.data
          : JSON.stringify(axiosResponse.data, null, 2)

      const response: Response = {
        id: uuidv4(),
        requestId: httpRequest.id,
        status: axiosResponse.status,
        statusText: axiosResponse.statusText,
        headers: axiosResponse.headers as Record<string, string>,
        body: responseBody,
        size: Buffer.byteLength(responseBody, 'utf-8'),
        time: endTime - startTime,
        timestamp: new Date().toISOString(),
        preRequestScriptResult
      }

      // Run test script if present
      if (httpRequest.testScript?.trim()) {
        const testResult = await scriptRunner.runTestScript(
          httpRequest.testScript,
          httpRequest,
          response,
          workingEnvironment
        )
        response.testScriptResult = convertScriptResult(testResult)
      }

      return response
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled')
      }

      // Network error or timeout
      const errorResponse: Response = {
        id: uuidv4(),
        requestId: httpRequest.id,
        status: 0,
        statusText: error.message || 'Network Error',
        headers: {},
        body: error.message || 'Network Error',
        size: 0,
        time: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        preRequestScriptResult
      }

      // Run test script even on error (user might want to test error handling)
      if (httpRequest.testScript?.trim()) {
        const testResult = await scriptRunner.runTestScript(
          httpRequest.testScript,
          httpRequest,
          errorResponse,
          workingEnvironment
        )
        errorResponse.testScriptResult = convertScriptResult(testResult)
      }

      return errorResponse
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
