import axios, { CancelTokenSource } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import type {
  GraphQLRequest,
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

function applyAuth(request: GraphQLRequest, headers: Record<string, string>, environment?: Environment): void {
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

  const updatedVariables = [...environment.variables]

  for (const [key, value] of updates) {
    const existingIndex = updatedVariables.findIndex(v => v.key === key)
    if (existingIndex >= 0) {
      updatedVariables[existingIndex] = {
        ...updatedVariables[existingIndex],
        value,
        enabled: value !== ''
      }
    } else if (value !== '') {
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

export const graphqlService = {
  async send(request: GraphQLRequest, environment?: Environment): Promise<Response> {
    const cancelSource = axios.CancelToken.source()
    cancelTokens.set(request.id, cancelSource)

    let preRequestScriptResult: ScriptResult | undefined
    let workingEnvironment = environment

    // Run pre-request script if present
    if (request.preRequestScript?.trim()) {
      const result = await scriptRunner.runPreRequestScript(
        request.preRequestScript,
        request,
        environment
      )
      preRequestScriptResult = convertScriptResult(result)

      if (result.environmentUpdates.size > 0) {
        workingEnvironment = applyEnvironmentUpdates(environment, result.environmentUpdates)
      }

      if (!result.success) {
        return {
          id: uuidv4(),
          requestId: request.id,
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

    const url = interpolateVariables(request.url, workingEnvironment)
    const headers = buildHeaders(request.headers, workingEnvironment)

    // Apply authentication
    applyAuth(request, headers, workingEnvironment)

    // Set content-type for GraphQL
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'

    // Build the GraphQL body
    const query = interpolateVariables(request.query, workingEnvironment)
    let variables: Record<string, unknown> | undefined

    if (request.variables.trim()) {
      try {
        const interpolatedVars = interpolateVariables(request.variables, workingEnvironment)
        variables = JSON.parse(interpolatedVars)
      } catch {
        // Invalid JSON variables - send as-is and let the server handle the error
        variables = undefined
      }
    }

    const graphqlBody = {
      query,
      variables
    }

    const startTime = Date.now()

    try {
      const axiosResponse = await axios({
        method: 'POST',
        url,
        headers,
        data: graphqlBody,
        cancelToken: cancelSource.token,
        timeout: 30000,
        validateStatus: () => true
      })

      const endTime = Date.now()
      const responseBody =
        typeof axiosResponse.data === 'string'
          ? axiosResponse.data
          : JSON.stringify(axiosResponse.data, null, 2)

      const response: Response = {
        id: uuidv4(),
        requestId: request.id,
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
      if (request.testScript?.trim()) {
        const testResult = await scriptRunner.runTestScript(
          request.testScript,
          request,
          response,
          workingEnvironment
        )
        response.testScriptResult = convertScriptResult(testResult)
      }

      return response
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled')
      }

      const errorMessage = error instanceof Error ? error.message : 'Network Error'
      const errorResponse: Response = {
        id: uuidv4(),
        requestId: request.id,
        status: 0,
        statusText: errorMessage,
        headers: {},
        body: errorMessage,
        size: 0,
        time: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        preRequestScriptResult
      }

      if (request.testScript?.trim()) {
        const testResult = await scriptRunner.runTestScript(
          request.testScript,
          request,
          errorResponse,
          workingEnvironment
        )
        errorResponse.testScriptResult = convertScriptResult(testResult)
      }

      return errorResponse
    } finally {
      cancelTokens.delete(request.id)
    }
  },

  async introspect(url: string, headers?: KeyValuePair[], environment?: Environment): Promise<string> {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type {
          ...TypeRef
        }
        defaultValue
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    const requestHeaders = buildHeaders(headers || [], environment)
    requestHeaders['Content-Type'] = 'application/json'

    const interpolatedUrl = interpolateVariables(url, environment)

    const response = await axios({
      method: 'POST',
      url: interpolatedUrl,
      headers: requestHeaders,
      data: { query: introspectionQuery },
      timeout: 30000
    })

    return JSON.stringify(response.data, null, 2)
  },

  cancel(requestId: string): void {
    const cancelSource = cancelTokens.get(requestId)
    if (cancelSource) {
      cancelSource.cancel('Request cancelled by user')
      cancelTokens.delete(requestId)
    }
  }
}
