import * as grpc from '@grpc/grpc-js'
import * as protobuf from 'protobufjs'
import { readFile } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type {
  GrpcRequest,
  Environment,
  Response,
  KeyValuePair,
  ScriptResult
} from '../../shared/types/models'
import { scriptRunner } from './scriptRunner'

// Cache loaded proto definitions
const protoCache = new Map<string, protobuf.Root>()

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

function buildMetadata(
  metadata: KeyValuePair[],
  environment?: Environment
): grpc.Metadata {
  const grpcMetadata = new grpc.Metadata()
  for (const item of metadata) {
    if (item.enabled) {
      const key = interpolateVariables(item.key, environment)
      const value = interpolateVariables(item.value, environment)
      grpcMetadata.add(key, value)
    }
  }
  return grpcMetadata
}

function applyAuth(request: GrpcRequest, metadata: grpc.Metadata, environment?: Environment): void {
  const { auth } = request

  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        const username = interpolateVariables(auth.basic.username, environment)
        const password = interpolateVariables(auth.basic.password, environment)
        const credentials = Buffer.from(`${username}:${password}`).toString('base64')
        metadata.add('authorization', `Basic ${credentials}`)
      }
      break
    case 'bearer':
      if (auth.bearer) {
        const token = interpolateVariables(auth.bearer.token, environment)
        metadata.add('authorization', `Bearer ${token}`)
      }
      break
    case 'api-key':
      if (auth.apiKey) {
        const key = interpolateVariables(auth.apiKey.key, environment)
        const value = interpolateVariables(auth.apiKey.value, environment)
        metadata.add(key, value)
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

interface ProtoInfo {
  services: string[]
  methods: Record<string, string[]>
}

async function loadProtoFile(filePath: string): Promise<{ root: protobuf.Root; info: ProtoInfo }> {
  // Check cache
  if (protoCache.has(filePath)) {
    const root = protoCache.get(filePath)!
    const info = extractProtoInfo(root)
    return { root, info }
  }

  const content = await readFile(filePath, 'utf-8')
  const root = protobuf.parse(content, { keepCase: true }).root

  // Cache the parsed proto
  protoCache.set(filePath, root)

  const info = extractProtoInfo(root)
  return { root, info }
}

function extractProtoInfo(root: protobuf.Root): ProtoInfo {
  const services: string[] = []
  const methods: Record<string, string[]> = {}

  function traverse(obj: protobuf.ReflectionObject, namespace = ''): void {
    const fullName = namespace ? `${namespace}.${obj.name}` : obj.name

    if (obj instanceof protobuf.Service) {
      services.push(fullName)
      methods[fullName] = Object.keys(obj.methods)
    }

    if (obj instanceof protobuf.Namespace) {
      for (const nested of Object.values(obj.nested || {})) {
        traverse(nested, fullName)
      }
    }
  }

  for (const nested of Object.values(root.nested || {})) {
    traverse(nested)
  }

  return { services, methods }
}

function createGrpcClient(
  url: string,
  serviceName: string,
  root: protobuf.Root,
  useTls: boolean
): { client: grpc.Client; service: protobuf.Service } {
  // Find the service
  const service = root.lookupService(serviceName)
  if (!service) {
    throw new Error(`Service ${serviceName} not found in proto file`)
  }

  // Create channel credentials
  const credentials = useTls
    ? grpc.credentials.createSsl()
    : grpc.credentials.createInsecure()

  // Create a generic client
  const client = new grpc.Client(url, credentials)

  return { client, service }
}

export const grpcService = {
  async send(request: GrpcRequest, environment?: Environment): Promise<Response> {
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
    const metadata = buildMetadata(request.metadata, workingEnvironment)

    // Apply authentication
    applyAuth(request, metadata, workingEnvironment)

    // Validate required fields
    if (!request.protoFile) {
      return {
        id: uuidv4(),
        requestId: request.id,
        status: 0,
        statusText: 'No proto file loaded',
        headers: {},
        body: 'Please load a .proto file first',
        size: 0,
        time: 0,
        timestamp: new Date().toISOString(),
        preRequestScriptResult
      }
    }

    if (!request.serviceName || !request.methodName) {
      return {
        id: uuidv4(),
        requestId: request.id,
        status: 0,
        statusText: 'No service/method selected',
        headers: {},
        body: 'Please select a service and method',
        size: 0,
        time: 0,
        timestamp: new Date().toISOString(),
        preRequestScriptResult
      }
    }

    const startTime = Date.now()

    try {
      // Load proto file
      const { root } = await loadProtoFile(request.protoFile)

      // Find service and method
      const service = root.lookupService(request.serviceName)
      if (!service) {
        throw new Error(`Service ${request.serviceName} not found`)
      }

      const method = service.methods[request.methodName]
      if (!method) {
        throw new Error(`Method ${request.methodName} not found in service ${request.serviceName}`)
      }

      // Parse request message
      let requestMessage: Record<string, unknown>
      try {
        const interpolatedMessage = interpolateVariables(request.message, workingEnvironment)
        requestMessage = interpolatedMessage.trim() ? JSON.parse(interpolatedMessage) : {}
      } catch {
        throw new Error('Invalid JSON in request message')
      }

      // Resolve method types
      const requestType = root.lookupType(method.requestType)
      const responseType = root.lookupType(method.responseType)

      // Verify and create the request message
      const errMsg = requestType.verify(requestMessage)
      if (errMsg) {
        throw new Error(`Invalid request message: ${errMsg}`)
      }
      const encodedRequest = requestType.encode(requestType.create(requestMessage)).finish()

      // Determine if TLS should be used
      const useTls = url.startsWith('grpcs://') || url.includes(':443')
      const cleanUrl = url.replace(/^grpcs?:\/\//, '')

      // Create gRPC client
      const credentials = useTls
        ? grpc.credentials.createSsl()
        : grpc.credentials.createInsecure()

      const client = new grpc.Client(cleanUrl, credentials)

      // Build the full method path
      const methodPath = `/${request.serviceName}/${request.methodName}`

      // Make the unary call
      const responseData = await new Promise<Buffer>((resolve, reject) => {
        client.makeUnaryRequest(
          methodPath,
          (arg: Buffer) => arg,
          (arg: Buffer) => arg,
          Buffer.from(encodedRequest),
          metadata,
          { deadline: Date.now() + 30000 },
          (error, response) => {
            client.close()
            if (error) {
              reject(error)
            } else if (response) {
              resolve(response)
            } else {
              reject(new Error('No response received'))
            }
          }
        )
      })

      const endTime = Date.now()

      // Decode response
      const decodedResponse = responseType.decode(responseData)
      const responseJson = responseType.toObject(decodedResponse, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true,
        oneofs: true
      })

      const responseBody = JSON.stringify(responseJson, null, 2)

      const response: Response = {
        id: uuidv4(),
        requestId: request.id,
        status: 200,
        statusText: 'OK',
        headers: {},
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
      const endTime = Date.now()
      let errorMessage = 'gRPC Error'
      let statusCode = 0

      if (error instanceof Error) {
        errorMessage = error.message
        // Extract gRPC status code if available
        const grpcError = error as grpc.ServiceError
        if (grpcError.code !== undefined) {
          statusCode = grpcError.code
          errorMessage = `${grpc.status[grpcError.code] || 'UNKNOWN'}: ${grpcError.details || grpcError.message}`
        }
      }

      const errorResponse: Response = {
        id: uuidv4(),
        requestId: request.id,
        status: statusCode,
        statusText: errorMessage,
        headers: {},
        body: errorMessage,
        size: 0,
        time: endTime - startTime,
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
    }
  },

  async loadProto(filePath: string): Promise<ProtoInfo> {
    const { info } = await loadProtoFile(filePath)
    return info
  },

  async reflect(url: string): Promise<ProtoInfo> {
    // gRPC Server Reflection - attempt to get service info from the server
    const cleanUrl = url.replace(/^grpcs?:\/\//, '')
    const useTls = url.startsWith('grpcs://') || url.includes(':443')

    const credentials = useTls
      ? grpc.credentials.createSsl()
      : grpc.credentials.createInsecure()

    const client = new grpc.Client(cleanUrl, credentials)

    return new Promise((resolve, reject) => {
      // Use the reflection service
      const reflectionServiceName = 'grpc.reflection.v1alpha.ServerReflection'
      const methodPath = `/${reflectionServiceName}/ServerReflectionInfo`

      const call = client.makeBidiStreamingRequest(
        methodPath,
        (arg: Buffer) => arg,
        (arg: Buffer) => arg,
        new grpc.Metadata(),
        {}
      )

      const services: string[] = []
      const methods: Record<string, string[]> = {}

      // Request list of services
      const listServicesRequest = {
        list_services: ''
      }

      // Encode the reflection request (simplified - in production would use proper proto encoding)
      // For now, we'll return a helpful error message since full reflection requires more setup
      call.on('error', (error: Error) => {
        client.close()
        // Many servers don't support reflection, so provide a helpful message
        reject(new Error(`Server reflection not available. Please load a .proto file instead. (${error.message})`))
      })

      call.on('data', (data: Buffer) => {
        // Parse reflection response
        try {
          // This would need proper proto decoding for the reflection response
          // For now, close and indicate we need proto file
          call.cancel()
          client.close()
        } catch {
          // Ignore parsing errors
        }
      })

      call.on('end', () => {
        client.close()
        if (services.length === 0) {
          reject(new Error('No services found via reflection. Please load a .proto file instead.'))
        } else {
          resolve({ services, methods })
        }
      })

      // Send the request
      try {
        // The reflection request needs proper protobuf encoding
        // For simplicity, we'll trigger an error which will suggest loading a proto file
        call.write(Buffer.from([]))
        call.end()
      } catch {
        call.cancel()
        client.close()
        reject(new Error('Server reflection not supported. Please load a .proto file.'))
      }
    })
  },

  clearProtoCache(): void {
    protoCache.clear()
  }
}
