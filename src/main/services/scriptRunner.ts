import vm from 'vm'
import type {
  Request,
  HttpRequest,
  Response,
  Environment,
  EnvironmentVariable
} from '../../shared/types/models'

export interface ScriptResult {
  success: boolean
  error?: string
  consoleLogs: string[]
  environmentUpdates: Map<string, string>
  testResults: TestResult[]
  duration: number
}

export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

interface ScriptContext {
  request: Request
  response?: Response
  environment?: Environment
  consoleLogs: string[]
  environmentUpdates: Map<string, string>
  testResults: TestResult[]
}

function createPmObject(context: ScriptContext) {
  const { request, response, environment, consoleLogs, environmentUpdates, testResults } = context

  // Build request info object
  const httpRequest = request as HttpRequest
  const requestInfo = {
    url: httpRequest.url,
    method: httpRequest.method,
    headers: Object.fromEntries(
      httpRequest.headers
        .filter(h => h.enabled)
        .map(h => [h.key, h.value])
    ),
    body: httpRequest.body?.content || ''
  }

  // Build response info object (for test scripts)
  const responseInfo = response ? {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body: response.body,
    time: response.time,
    size: response.size,
    json: () => {
      try {
        return JSON.parse(response.body)
      } catch {
        throw new Error('Response body is not valid JSON')
      }
    },
    text: () => response.body
  } : null

  // Environment helpers
  const envHelpers = {
    get: (key: string): string | undefined => {
      // Check updates first (for variables set during script execution)
      if (environmentUpdates.has(key)) {
        return environmentUpdates.get(key)
      }
      // Then check environment
      if (environment) {
        const variable = environment.variables.find(v => v.key === key && v.enabled)
        return variable?.value
      }
      return undefined
    },
    set: (key: string, value: string): void => {
      environmentUpdates.set(key, String(value))
    },
    unset: (key: string): void => {
      environmentUpdates.set(key, '')
    },
    has: (key: string): boolean => {
      if (environmentUpdates.has(key)) {
        return environmentUpdates.get(key) !== ''
      }
      if (environment) {
        return environment.variables.some(v => v.key === key && v.enabled)
      }
      return false
    }
  }

  // Test function for post-request scripts
  const test = (name: string, fn: () => void): void => {
    try {
      fn()
      testResults.push({ name, passed: true })
    } catch (error: any) {
      testResults.push({
        name,
        passed: false,
        error: error.message || String(error)
      })
    }
  }

  // Simple expect implementation for assertions
  const expect = (value: any) => {
    return {
      to: {
        be: {
          equal: (expected: any) => {
            if (value !== expected) {
              throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`)
            }
          },
          a: (type: string) => {
            const actualType = typeof value
            if (actualType !== type) {
              throw new Error(`Expected ${JSON.stringify(value)} to be a ${type}, but got ${actualType}`)
            }
          },
          an: (type: string) => {
            const actualType = typeof value
            if (actualType !== type) {
              throw new Error(`Expected ${JSON.stringify(value)} to be an ${type}, but got ${actualType}`)
            }
          },
          true: (() => {
            if (value !== true) {
              throw new Error(`Expected ${JSON.stringify(value)} to be true`)
            }
          }),
          false: (() => {
            if (value !== false) {
              throw new Error(`Expected ${JSON.stringify(value)} to be false`)
            }
          }),
          null: (() => {
            if (value !== null) {
              throw new Error(`Expected ${JSON.stringify(value)} to be null`)
            }
          }),
          undefined: (() => {
            if (value !== undefined) {
              throw new Error(`Expected ${JSON.stringify(value)} to be undefined`)
            }
          }),
          above: (n: number) => {
            if (typeof value !== 'number' || value <= n) {
              throw new Error(`Expected ${value} to be above ${n}`)
            }
          },
          below: (n: number) => {
            if (typeof value !== 'number' || value >= n) {
              throw new Error(`Expected ${value} to be below ${n}`)
            }
          },
          ok: (() => {
            if (!value) {
              throw new Error(`Expected ${JSON.stringify(value)} to be truthy`)
            }
          })
        },
        have: {
          property: (prop: string, val?: any) => {
            if (typeof value !== 'object' || value === null || !(prop in value)) {
              throw new Error(`Expected object to have property "${prop}"`)
            }
            if (val !== undefined && value[prop] !== val) {
              throw new Error(`Expected property "${prop}" to equal ${JSON.stringify(val)}, got ${JSON.stringify(value[prop])}`)
            }
          },
          length: (len: number) => {
            if (!('length' in value) || value.length !== len) {
              throw new Error(`Expected length ${len}, got ${value.length}`)
            }
          },
          status: (code: number) => {
            if (!response || response.status !== code) {
              throw new Error(`Expected status ${code}, got ${response?.status}`)
            }
          }
        },
        include: (item: any) => {
          if (typeof value === 'string') {
            if (!value.includes(item)) {
              throw new Error(`Expected string to include "${item}"`)
            }
          } else if (Array.isArray(value)) {
            if (!value.includes(item)) {
              throw new Error(`Expected array to include ${JSON.stringify(item)}`)
            }
          } else {
            throw new Error('Include assertion requires string or array')
          }
        },
        equal: (expected: any) => {
          if (value !== expected) {
            throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`)
          }
        },
        eql: (expected: any) => {
          if (JSON.stringify(value) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(value)} to deeply equal ${JSON.stringify(expected)}`)
          }
        }
      },
      not: {
        to: {
          be: {
            equal: (expected: any) => {
              if (value === expected) {
                throw new Error(`Expected ${JSON.stringify(value)} not to equal ${JSON.stringify(expected)}`)
              }
            },
            null: (() => {
              if (value === null) {
                throw new Error('Expected value not to be null')
              }
            }),
            undefined: (() => {
              if (value === undefined) {
                throw new Error('Expected value not to be undefined')
              }
            })
          },
          include: (item: any) => {
            if (typeof value === 'string' && value.includes(item)) {
              throw new Error(`Expected string not to include "${item}"`)
            } else if (Array.isArray(value) && value.includes(item)) {
              throw new Error(`Expected array not to include ${JSON.stringify(item)}`)
            }
          }
        }
      }
    }
  }

  return {
    request: requestInfo,
    response: responseInfo,
    environment: envHelpers,
    variables: envHelpers, // Alias for compatibility
    test,
    expect
  }
}

function createConsole(logs: string[]) {
  const formatArgs = (...args: any[]): string => {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    }).join(' ')
  }

  return {
    log: (...args: any[]) => logs.push(formatArgs(...args)),
    info: (...args: any[]) => logs.push(`[INFO] ${formatArgs(...args)}`),
    warn: (...args: any[]) => logs.push(`[WARN] ${formatArgs(...args)}`),
    error: (...args: any[]) => logs.push(`[ERROR] ${formatArgs(...args)}`),
    debug: (...args: any[]) => logs.push(`[DEBUG] ${formatArgs(...args)}`)
  }
}

export const scriptRunner = {
  async runPreRequestScript(
    script: string,
    request: Request,
    environment?: Environment
  ): Promise<ScriptResult> {
    if (!script.trim()) {
      return {
        success: true,
        consoleLogs: [],
        environmentUpdates: new Map(),
        testResults: [],
        duration: 0
      }
    }

    const startTime = Date.now()
    const consoleLogs: string[] = []
    const environmentUpdates = new Map<string, string>()
    const testResults: TestResult[] = []

    const context: ScriptContext = {
      request,
      environment,
      consoleLogs,
      environmentUpdates,
      testResults
    }

    try {
      const pm = createPmObject(context)
      const consoleObj = createConsole(consoleLogs)

      // Create sandbox with limited globals
      const sandbox = {
        pm,
        console: consoleObj,
        JSON,
        Math,
        Date,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
        encodeURI,
        decodeURI,
        btoa: (str: string) => Buffer.from(str).toString('base64'),
        atob: (str: string) => Buffer.from(str, 'base64').toString(),
        setTimeout: undefined,
        setInterval: undefined,
        setImmediate: undefined,
        require: undefined,
        process: undefined,
        global: undefined,
        globalThis: undefined
      }

      vm.createContext(sandbox)
      vm.runInContext(script, sandbox, {
        timeout: 5000, // 5 second timeout
        filename: 'pre-request-script.js'
      })

      return {
        success: true,
        consoleLogs,
        environmentUpdates,
        testResults,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
        consoleLogs,
        environmentUpdates,
        testResults,
        duration: Date.now() - startTime
      }
    }
  },

  async runTestScript(
    script: string,
    request: Request,
    response: Response,
    environment?: Environment
  ): Promise<ScriptResult> {
    if (!script.trim()) {
      return {
        success: true,
        consoleLogs: [],
        environmentUpdates: new Map(),
        testResults: [],
        duration: 0
      }
    }

    const startTime = Date.now()
    const consoleLogs: string[] = []
    const environmentUpdates = new Map<string, string>()
    const testResults: TestResult[] = []

    const context: ScriptContext = {
      request,
      response,
      environment,
      consoleLogs,
      environmentUpdates,
      testResults
    }

    try {
      const pm = createPmObject(context)
      const consoleObj = createConsole(consoleLogs)

      // Create sandbox with limited globals
      const sandbox = {
        pm,
        console: consoleObj,
        JSON,
        Math,
        Date,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
        encodeURI,
        decodeURI,
        btoa: (str: string) => Buffer.from(str).toString('base64'),
        atob: (str: string) => Buffer.from(str, 'base64').toString(),
        setTimeout: undefined,
        setInterval: undefined,
        setImmediate: undefined,
        require: undefined,
        process: undefined,
        global: undefined,
        globalThis: undefined
      }

      vm.createContext(sandbox)
      vm.runInContext(script, sandbox, {
        timeout: 5000, // 5 second timeout
        filename: 'test-script.js'
      })

      return {
        success: true,
        consoleLogs,
        environmentUpdates,
        testResults,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
        consoleLogs,
        environmentUpdates,
        testResults,
        duration: Date.now() - startTime
      }
    }
  }
}
