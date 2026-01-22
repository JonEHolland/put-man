import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Create a mock in-memory database storage
let mockStorage: Record<string, unknown[]> = {}
let mockStatements: Map<string, unknown> = new Map()

// Mock the database
const createMockDb = () => {
  mockStorage = {
    collections: [],
    folders: [],
    requests: [],
    environments: [],
    history: []
  }

  const mockPrepare = (sql: string) => {
    return {
      run: vi.fn((...params: unknown[]) => {
        // Simple INSERT detection
        if (sql.includes('INSERT INTO collections')) {
          mockStorage.collections.push({
            id: params[0],
            name: params[1],
            description: params[2],
            created_at: params[3],
            updated_at: params[4]
          })
        }
        if (sql.includes('INSERT INTO folders')) {
          mockStorage.folders.push({
            id: params[0],
            collection_id: params[1],
            parent_id: params[2],
            name: params[3],
            created_at: params[4],
            updated_at: params[5]
          })
        }
        if (sql.includes('INSERT INTO requests')) {
          mockStorage.requests.push({
            id: params[0],
            collection_id: params[1],
            folder_id: params[2],
            request_data: params[3],
            sort_order: params[4]
          })
        }
        if (sql.includes('INSERT INTO environments')) {
          mockStorage.environments.push({
            id: params[0],
            name: params[1],
            variables: params[2],
            is_active: params[3],
            created_at: params[4],
            updated_at: params[5]
          })
        }
        if (sql.includes('INSERT INTO history')) {
          mockStorage.history.push({
            id: params[0],
            request_data: params[1],
            response_data: params[2],
            timestamp: params[3]
          })
        }
        if (sql.includes('DELETE FROM collections')) {
          mockStorage.collections = mockStorage.collections.filter(
            (c: unknown) => (c as { id: string }).id !== params[0]
          )
        }
        if (sql.includes('DELETE FROM folders') && !sql.includes('parent_id')) {
          mockStorage.folders = mockStorage.folders.filter(
            (f: unknown) => (f as { id: string }).id !== params[0]
          )
        }
        if (sql.includes('DELETE FROM requests') && !sql.includes('NOT IN')) {
          mockStorage.requests = mockStorage.requests.filter(
            (r: unknown) => (r as { id: string }).id !== params[0]
          )
        }
        if (sql.includes('DELETE FROM environments')) {
          mockStorage.environments = mockStorage.environments.filter(
            (e: unknown) => (e as { id: string }).id !== params[0]
          )
        }
        if (sql.includes('DELETE FROM history') && !sql.includes('NOT IN')) {
          mockStorage.history = []
        }
        if (sql.includes('UPDATE collections')) {
          const idx = mockStorage.collections.findIndex(
            (c: unknown) => (c as { id: string }).id === params[3]
          )
          if (idx !== -1) {
            const col = mockStorage.collections[idx] as { name: string; description: string | null; updated_at: string }
            col.name = params[0] as string
            col.description = params[1] as string | null
            col.updated_at = params[2] as string
          }
        }
        if (sql.includes('UPDATE folders SET name')) {
          const idx = mockStorage.folders.findIndex(
            (f: unknown) => (f as { id: string }).id === params[3]
          )
          if (idx !== -1) {
            const folder = mockStorage.folders[idx] as { name: string; parent_id: string | null; updated_at: string }
            folder.name = params[0] as string
            folder.parent_id = params[1] as string | null
            folder.updated_at = params[2] as string
          }
        }
        if (sql.includes('UPDATE requests SET request_data')) {
          const idx = mockStorage.requests.findIndex(
            (r: unknown) => (r as { id: string }).id === params[1]
          )
          if (idx !== -1) {
            const req = mockStorage.requests[idx] as { request_data: string }
            req.request_data = params[0] as string
          }
        }
        if (sql.includes('UPDATE requests SET folder_id')) {
          const idx = mockStorage.requests.findIndex(
            (r: unknown) => (r as { id: string }).id === params[1]
          )
          if (idx !== -1) {
            const req = mockStorage.requests[idx] as { folder_id: string | null }
            req.folder_id = params[0] as string | null
          }
        }
        if (sql.includes('UPDATE environments SET name')) {
          const idx = mockStorage.environments.findIndex(
            (e: unknown) => (e as { id: string }).id === params[4]
          )
          if (idx !== -1) {
            const env = mockStorage.environments[idx] as { name: string; variables: string; is_active: number; updated_at: string }
            env.name = params[0] as string
            env.variables = params[1] as string
            env.is_active = params[2] as number
            env.updated_at = params[3] as string
          }
        }
        if (sql.includes('UPDATE environments SET is_active = 0') && !sql.includes('WHERE')) {
          mockStorage.environments.forEach((e: unknown) => {
            (e as { is_active: number }).is_active = 0
          })
        }
        if (sql.includes('UPDATE environments SET is_active = 1 WHERE')) {
          const idx = mockStorage.environments.findIndex(
            (e: unknown) => (e as { id: string }).id === params[0]
          )
          if (idx !== -1) {
            (mockStorage.environments[idx] as { is_active: number }).is_active = 1
          }
        }
        return {}
      }),
      get: vi.fn((...params: unknown[]) => {
        if (sql.includes('SELECT * FROM collections WHERE id')) {
          return mockStorage.collections.find(
            (c: unknown) => (c as { id: string }).id === params[0]
          )
        }
        if (sql.includes('SELECT * FROM folders WHERE id')) {
          return mockStorage.folders.find(
            (f: unknown) => (f as { id: string }).id === params[0]
          )
        }
        if (sql.includes('SELECT * FROM requests WHERE id')) {
          return mockStorage.requests.find(
            (r: unknown) => (r as { id: string }).id === params[0]
          )
        }
        if (sql.includes('SELECT * FROM environments WHERE id')) {
          return mockStorage.environments.find(
            (e: unknown) => (e as { id: string }).id === params[0]
          )
        }
        if (sql.includes('MAX(sort_order)')) {
          const requests = mockStorage.requests.filter(
            (r: unknown) => (r as { collection_id: string }).collection_id === params[0]
          )
          if (requests.length === 0) return { max_order: null }
          const max = Math.max(...requests.map((r: unknown) => (r as { sort_order: number }).sort_order))
          return { max_order: max }
        }
        return undefined
      }),
      all: vi.fn((...params: unknown[]) => {
        if (sql.includes('SELECT * FROM collections ORDER BY')) {
          return [...mockStorage.collections]
        }
        if (sql.includes('SELECT * FROM folders WHERE collection_id')) {
          return mockStorage.folders.filter(
            (f: unknown) => (f as { collection_id: string }).collection_id === params[0]
          )
        }
        if (sql.includes('SELECT id FROM folders WHERE parent_id')) {
          return mockStorage.folders.filter(
            (f: unknown) => (f as { parent_id: string | null }).parent_id === params[0]
          )
        }
        if (sql.includes('SELECT * FROM requests WHERE collection_id')) {
          return mockStorage.requests.filter(
            (r: unknown) => (r as { collection_id: string }).collection_id === params[0]
          )
        }
        if (sql.includes('SELECT * FROM environments ORDER BY')) {
          return [...mockStorage.environments]
        }
        if (sql.includes('SELECT * FROM history ORDER BY')) {
          return mockStorage.history.slice(0, params[0] as number)
        }
        return []
      })
    }
  }

  return {
    prepare: mockPrepare,
    transaction: vi.fn(<T>(fn: () => T) => fn),
    exec: vi.fn(),
    pragma: vi.fn(),
    close: vi.fn()
  }
}

let mockDb: ReturnType<typeof createMockDb>

// Mock the init module
vi.mock('./init', () => ({
  getDb: () => mockDb
}))

// Import after mocking
import {
  collectionsRepo,
  foldersRepo,
  requestsRepo,
  environmentsRepo,
  historyRepo
} from './repositories'

describe('repositories', () => {
  beforeEach(() => {
    mockDb = createMockDb()
    mockStorage = {
      collections: [],
      folders: [],
      requests: [],
      environments: [],
      history: []
    }
  })

  describe('collectionsRepo', () => {
    describe('getAll', () => {
      it('should return all collections', () => {
        mockStorage.collections = [
          { id: 'col-1', name: 'Test', description: null, created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        const result = collectionsRepo.getAll()

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('col-1')
        expect(result[0].name).toBe('Test')
      })
    })

    describe('create', () => {
      it('should create a collection', () => {
        const result = collectionsRepo.create('New Collection', 'Description')

        expect(result.name).toBe('New Collection')
        expect(result.description).toBe('Description')
        expect(result.id).toBeDefined()
        expect(result.createdAt).toBeDefined()
      })

      it('should create a collection without description', () => {
        const result = collectionsRepo.create('New Collection')

        expect(result.name).toBe('New Collection')
        expect(result.description).toBeUndefined()
      })
    })

    describe('update', () => {
      it('should update a collection', () => {
        mockStorage.collections = [
          { id: 'col-1', name: 'Old Name', description: 'Old desc', created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        const result = collectionsRepo.update('col-1', { name: 'New Name' })

        expect(result.name).toBe('New Name')
        expect(result.id).toBe('col-1')
      })

      it('should throw if collection not found', () => {
        expect(() => collectionsRepo.update('nonexistent', { name: 'Test' }))
          .toThrow('Collection not found')
      })
    })

    describe('delete', () => {
      it('should delete a collection', () => {
        mockStorage.collections = [
          { id: 'col-1', name: 'Test', description: null, created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        collectionsRepo.delete('col-1')

        expect(mockStorage.collections).toHaveLength(0)
      })
    })
  })

  describe('foldersRepo', () => {
    describe('getByCollection', () => {
      it('should return folders for a collection', () => {
        mockStorage.folders = [
          { id: 'f-1', collection_id: 'col-1', parent_id: null, name: 'Folder 1', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'f-2', collection_id: 'col-2', parent_id: null, name: 'Folder 2', created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        const result = foldersRepo.getByCollection('col-1')

        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Folder 1')
      })
    })

    describe('create', () => {
      it('should create a folder', () => {
        const result = foldersRepo.create('col-1', 'New Folder')

        expect(result.name).toBe('New Folder')
        expect(result.collectionId).toBe('col-1')
        expect(result.parentId).toBeUndefined()
      })

      it('should create a nested folder', () => {
        const result = foldersRepo.create('col-1', 'Child Folder', 'parent-id')

        expect(result.parentId).toBe('parent-id')
      })
    })

    describe('update', () => {
      it('should update a folder', () => {
        mockStorage.folders = [
          { id: 'f-1', collection_id: 'col-1', parent_id: null, name: 'Old Name', created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        const result = foldersRepo.update('f-1', { name: 'New Name' })

        expect(result.name).toBe('New Name')
      })

      it('should throw if folder not found', () => {
        expect(() => foldersRepo.update('nonexistent', { name: 'Test' }))
          .toThrow('Folder not found')
      })
    })

    describe('delete', () => {
      it('should delete a folder', () => {
        mockStorage.folders = [
          { id: 'f-1', collection_id: 'col-1', parent_id: null, name: 'Folder', created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        foldersRepo.delete('f-1')

        expect(mockStorage.folders).toHaveLength(0)
      })
    })
  })

  describe('requestsRepo', () => {
    describe('getByCollection', () => {
      it('should return requests for a collection', () => {
        mockStorage.requests = [
          { id: 'r-1', collection_id: 'col-1', folder_id: null, request_data: '{"name":"Test"}', sort_order: 0 },
          { id: 'r-2', collection_id: 'col-2', folder_id: null, request_data: '{"name":"Other"}', sort_order: 0 }
        ]

        const result = requestsRepo.getByCollection('col-1')

        expect(result).toHaveLength(1)
        expect(result[0].request.name).toBe('Test')
      })
    })

    describe('save', () => {
      it('should save a request', () => {
        const request = { name: 'New Request', method: 'GET', url: 'https://example.com' }

        const result = requestsRepo.save('col-1', request as never)

        expect(result.collectionId).toBe('col-1')
        expect(result.request).toEqual(request)
        expect(result.sortOrder).toBe(0)
      })

      it('should save with correct sort order', () => {
        mockStorage.requests = [
          { id: 'r-1', collection_id: 'col-1', folder_id: null, request_data: '{}', sort_order: 5 }
        ]

        const result = requestsRepo.save('col-1', { name: 'Test' } as never)

        expect(result.sortOrder).toBe(6)
      })
    })

    describe('update', () => {
      it('should update a request', () => {
        mockStorage.requests = [
          { id: 'r-1', collection_id: 'col-1', folder_id: null, request_data: '{"name":"Old"}', sort_order: 0 }
        ]

        const updatedRequest = { name: 'Updated' }
        const result = requestsRepo.update('r-1', updatedRequest as never)

        expect(result.request).toEqual(updatedRequest)
      })

      it('should throw if request not found', () => {
        expect(() => requestsRepo.update('nonexistent', {} as never))
          .toThrow('Request not found')
      })
    })

    describe('delete', () => {
      it('should delete a request', () => {
        mockStorage.requests = [
          { id: 'r-1', collection_id: 'col-1', folder_id: null, request_data: '{}', sort_order: 0 }
        ]

        requestsRepo.delete('r-1')

        expect(mockStorage.requests).toHaveLength(0)
      })
    })

    describe('move', () => {
      it('should move a request to a folder', () => {
        mockStorage.requests = [
          { id: 'r-1', collection_id: 'col-1', folder_id: null, request_data: '{"name":"Test"}', sort_order: 0 }
        ]

        const result = requestsRepo.move('r-1', 'folder-1')

        expect(result.folderId).toBe('folder-1')
      })

      it('should move a request to root', () => {
        mockStorage.requests = [
          { id: 'r-1', collection_id: 'col-1', folder_id: 'folder-1', request_data: '{"name":"Test"}', sort_order: 0 }
        ]

        const result = requestsRepo.move('r-1', null)

        expect(result.folderId).toBeUndefined()
      })

      it('should throw if request not found', () => {
        expect(() => requestsRepo.move('nonexistent', null))
          .toThrow('Request not found')
      })
    })
  })

  describe('environmentsRepo', () => {
    describe('getAll', () => {
      it('should return all environments', () => {
        mockStorage.environments = [
          { id: 'env-1', name: 'Dev', variables: '[]', is_active: 0, created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        const result = environmentsRepo.getAll()

        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Dev')
        expect(result[0].isActive).toBe(false)
      })
    })

    describe('create', () => {
      it('should create an environment', () => {
        const result = environmentsRepo.create('Production')

        expect(result.name).toBe('Production')
        expect(result.variables).toEqual([])
        expect(result.isActive).toBe(false)
      })
    })

    describe('update', () => {
      it('should update an environment', () => {
        mockStorage.environments = [
          { id: 'env-1', name: 'Old', variables: '[]', is_active: 0, created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        const result = environmentsRepo.update('env-1', { name: 'New' })

        expect(result.name).toBe('New')
      })

      it('should update variables', () => {
        mockStorage.environments = [
          { id: 'env-1', name: 'Test', variables: '[]', is_active: 0, created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        const newVars = [{ key: 'API_URL', value: 'https://api.com', enabled: true }]
        const result = environmentsRepo.update('env-1', { variables: newVars })

        expect(result.variables).toEqual(newVars)
      })

      it('should throw if environment not found', () => {
        expect(() => environmentsRepo.update('nonexistent', { name: 'Test' }))
          .toThrow('Environment not found')
      })
    })

    describe('setActive', () => {
      it('should set an environment as active', () => {
        mockStorage.environments = [
          { id: 'env-1', name: 'Dev', variables: '[]', is_active: 0, created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'env-2', name: 'Prod', variables: '[]', is_active: 0, created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        environmentsRepo.setActive('env-2')

        expect((mockStorage.environments[0] as { is_active: number }).is_active).toBe(0)
        expect((mockStorage.environments[1] as { is_active: number }).is_active).toBe(1)
      })

      it('should deactivate all when null is passed', () => {
        mockStorage.environments = [
          { id: 'env-1', name: 'Dev', variables: '[]', is_active: 1, created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        environmentsRepo.setActive(null)

        expect((mockStorage.environments[0] as { is_active: number }).is_active).toBe(0)
      })
    })

    describe('delete', () => {
      it('should delete an environment', () => {
        mockStorage.environments = [
          { id: 'env-1', name: 'Dev', variables: '[]', is_active: 0, created_at: '2024-01-01', updated_at: '2024-01-01' }
        ]

        environmentsRepo.delete('env-1')

        expect(mockStorage.environments).toHaveLength(0)
      })
    })
  })

  describe('historyRepo', () => {
    describe('getAll', () => {
      it('should return history with default limit', () => {
        mockStorage.history = [
          { id: 'h-1', request_data: '{"name":"Test"}', response_data: null, timestamp: '2024-01-01' }
        ]

        const result = historyRepo.getAll()

        expect(result).toHaveLength(1)
        expect(result[0].request.name).toBe('Test')
      })

      it('should return history with custom limit', () => {
        mockStorage.history = Array(200).fill(null).map((_, i) => ({
          id: `h-${i}`,
          request_data: `{"name":"Test ${i}"}`,
          response_data: null,
          timestamp: '2024-01-01'
        }))

        const result = historyRepo.getAll(50)

        expect(result).toHaveLength(50)
      })
    })

    describe('add', () => {
      it('should add a history entry', () => {
        const request = { name: 'Test', method: 'GET', url: 'https://example.com' }

        const result = historyRepo.add(request as never)

        expect(result.request).toEqual(request)
        expect(result.response).toBeUndefined()
        expect(result.timestamp).toBeDefined()
      })

      it('should add a history entry with response', () => {
        const request = { name: 'Test' }
        const response = { status: 200, body: '{}' }

        const result = historyRepo.add(request as never, response as never)

        expect(result.response).toEqual(response)
      })
    })

    describe('clear', () => {
      it('should clear all history', () => {
        mockStorage.history = [
          { id: 'h-1', request_data: '{}', response_data: null, timestamp: '2024-01-01' },
          { id: 'h-2', request_data: '{}', response_data: null, timestamp: '2024-01-01' }
        ]

        historyRepo.clear()

        expect(mockStorage.history).toHaveLength(0)
      })
    })
  })
})
