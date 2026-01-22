import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCollectionStore } from './collectionStore'
import type { Collection, Folder, CollectionRequest, Request } from '../../shared/types/models'

// Helper to create mock collections
const mockCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'col-1',
  name: 'Test Collection',
  description: 'Test description',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
})

// Helper to create mock folders
const mockFolder = (overrides: Partial<Folder> = {}): Folder => ({
  id: 'folder-1',
  collectionId: 'col-1',
  name: 'Test Folder',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
})

// Helper to create mock requests
const mockRequest = (overrides: Partial<Request> = {}): Request => ({
  id: 'req-1',
  type: 'http',
  name: 'Test Request',
  url: 'https://api.example.com/test',
  method: 'GET',
  headers: [],
  params: [],
  body: { type: 'none' },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
})

const mockCollectionRequest = (overrides: Partial<CollectionRequest> = {}): CollectionRequest => ({
  id: 'colreq-1',
  collectionId: 'col-1',
  request: mockRequest(),
  sortOrder: 0,
  ...overrides
})

describe('collectionStore', () => {
  beforeEach(() => {
    // Reset store state
    useCollectionStore.setState({
      collections: [],
      folders: {},
      requests: {},
      isLoading: false,
      expandedCollections: new Set<string>()
    })
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('loadCollections', () => {
    it('should load collections from API', async () => {
      const collections = [mockCollection(), mockCollection({ id: 'col-2', name: 'Second Collection' })]
      vi.mocked(window.api.db.getCollections).mockResolvedValueOnce(collections)

      const { loadCollections } = useCollectionStore.getState()
      await loadCollections()

      const state = useCollectionStore.getState()
      expect(state.collections).toEqual(collections)
      expect(state.isLoading).toBe(false)
    })

    it('should set isLoading while loading', async () => {
      vi.mocked(window.api.db.getCollections).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      const { loadCollections } = useCollectionStore.getState()
      const loadPromise = loadCollections()

      expect(useCollectionStore.getState().isLoading).toBe(true)

      await loadPromise
      expect(useCollectionStore.getState().isLoading).toBe(false)
    })
  })

  describe('createCollection', () => {
    it('should create a collection and add to state', async () => {
      const newCollection = mockCollection()
      vi.mocked(window.api.db.createCollection).mockResolvedValueOnce(newCollection)

      const { createCollection } = useCollectionStore.getState()
      const result = await createCollection('Test Collection', 'Test description')

      expect(window.api.db.createCollection).toHaveBeenCalledWith('Test Collection', 'Test description')
      expect(result).toEqual(newCollection)
      expect(useCollectionStore.getState().collections).toContainEqual(newCollection)
    })
  })

  describe('updateCollection', () => {
    it('should update a collection', async () => {
      const collection = mockCollection()
      useCollectionStore.setState({ collections: [collection] })

      const { updateCollection } = useCollectionStore.getState()
      await updateCollection('col-1', { name: 'Updated Name' })

      expect(window.api.db.updateCollection).toHaveBeenCalledWith('col-1', { name: 'Updated Name' })
      expect(useCollectionStore.getState().collections[0].name).toBe('Updated Name')
    })
  })

  describe('deleteCollection', () => {
    it('should delete a collection', async () => {
      const collections = [mockCollection(), mockCollection({ id: 'col-2' })]
      useCollectionStore.setState({ collections })

      const { deleteCollection } = useCollectionStore.getState()
      await deleteCollection('col-1')

      expect(window.api.db.deleteCollection).toHaveBeenCalledWith('col-1')
      expect(useCollectionStore.getState().collections).toHaveLength(1)
      expect(useCollectionStore.getState().collections[0].id).toBe('col-2')
    })
  })

  describe('toggleCollectionExpanded', () => {
    it('should expand a collapsed collection', () => {
      const collection = mockCollection()
      useCollectionStore.setState({ collections: [collection] })

      const { toggleCollectionExpanded } = useCollectionStore.getState()
      toggleCollectionExpanded('col-1')

      const state = useCollectionStore.getState()
      expect(state.expandedCollections.has('col-1')).toBe(true)
    })

    it('should collapse an expanded collection', () => {
      const collection = mockCollection()
      useCollectionStore.setState({
        collections: [collection],
        expandedCollections: new Set(['col-1'])
      })

      const { toggleCollectionExpanded } = useCollectionStore.getState()
      toggleCollectionExpanded('col-1')

      const state = useCollectionStore.getState()
      expect(state.expandedCollections.has('col-1')).toBe(false)
    })

    it('should load folders and requests when expanding', () => {
      const collection = mockCollection()
      useCollectionStore.setState({ collections: [collection] })

      const { toggleCollectionExpanded } = useCollectionStore.getState()
      toggleCollectionExpanded('col-1')

      expect(window.api.db.getFolders).toHaveBeenCalledWith('col-1')
      expect(window.api.db.getCollectionRequests).toHaveBeenCalledWith('col-1')
    })
  })

  describe('loadFolders', () => {
    it('should load folders for a collection', async () => {
      const folders = [mockFolder(), mockFolder({ id: 'folder-2', name: 'Second Folder' })]
      vi.mocked(window.api.db.getFolders).mockResolvedValueOnce(folders)

      const { loadFolders } = useCollectionStore.getState()
      await loadFolders('col-1')

      const state = useCollectionStore.getState()
      expect(state.folders['col-1']).toEqual(folders)
    })
  })

  describe('createFolder', () => {
    it('should create a folder and add to state', async () => {
      const newFolder = mockFolder()
      vi.mocked(window.api.db.createFolder).mockResolvedValueOnce(newFolder)

      const { createFolder } = useCollectionStore.getState()
      const result = await createFolder('col-1', 'Test Folder')

      expect(window.api.db.createFolder).toHaveBeenCalledWith('col-1', 'Test Folder', undefined)
      expect(result).toEqual(newFolder)
      expect(useCollectionStore.getState().folders['col-1']).toContainEqual(newFolder)
    })

    it('should create a folder with parent', async () => {
      const newFolder = mockFolder({ parentId: 'parent-folder' })
      vi.mocked(window.api.db.createFolder).mockResolvedValueOnce(newFolder)

      const { createFolder } = useCollectionStore.getState()
      await createFolder('col-1', 'Test Folder', 'parent-folder')

      expect(window.api.db.createFolder).toHaveBeenCalledWith('col-1', 'Test Folder', 'parent-folder')
    })
  })

  describe('updateFolder', () => {
    it('should update a folder', async () => {
      useCollectionStore.setState({
        folders: { 'col-1': [mockFolder()] }
      })

      const { updateFolder } = useCollectionStore.getState()
      await updateFolder('folder-1', { name: 'Updated Folder' })

      expect(window.api.db.updateFolder).toHaveBeenCalledWith('folder-1', { name: 'Updated Folder' })
      expect(useCollectionStore.getState().folders['col-1'][0].name).toBe('Updated Folder')
    })
  })

  describe('deleteFolder', () => {
    it('should delete a folder', async () => {
      useCollectionStore.setState({
        folders: { 'col-1': [mockFolder(), mockFolder({ id: 'folder-2' })] }
      })

      const { deleteFolder } = useCollectionStore.getState()
      await deleteFolder('folder-1')

      expect(window.api.db.deleteFolder).toHaveBeenCalledWith('folder-1')
      expect(useCollectionStore.getState().folders['col-1']).toHaveLength(1)
      expect(useCollectionStore.getState().folders['col-1'][0].id).toBe('folder-2')
    })
  })

  describe('loadRequests', () => {
    it('should load requests for a collection', async () => {
      const requests = [mockCollectionRequest(), mockCollectionRequest({ id: 'colreq-2' })]
      vi.mocked(window.api.db.getCollectionRequests).mockResolvedValueOnce(requests)

      const { loadRequests } = useCollectionStore.getState()
      await loadRequests('col-1')

      const state = useCollectionStore.getState()
      expect(state.requests['col-1']).toEqual(requests)
    })
  })

  describe('saveRequest', () => {
    it('should save a request to a collection', async () => {
      const request = mockRequest()
      const collectionRequest = mockCollectionRequest({ request })
      vi.mocked(window.api.db.saveRequest).mockResolvedValueOnce(collectionRequest)

      const { saveRequest } = useCollectionStore.getState()
      const result = await saveRequest('col-1', request)

      expect(window.api.db.saveRequest).toHaveBeenCalledWith('col-1', request, undefined)
      expect(result).toEqual(collectionRequest)
      expect(useCollectionStore.getState().requests['col-1']).toContainEqual(collectionRequest)
    })

    it('should save a request to a specific folder', async () => {
      const request = mockRequest()
      const collectionRequest = mockCollectionRequest({ request, folderId: 'folder-1' })
      vi.mocked(window.api.db.saveRequest).mockResolvedValueOnce(collectionRequest)

      const { saveRequest } = useCollectionStore.getState()
      await saveRequest('col-1', request, 'folder-1')

      expect(window.api.db.saveRequest).toHaveBeenCalledWith('col-1', request, 'folder-1')
    })
  })

  describe('updateRequest', () => {
    it('should update a request', async () => {
      const originalRequest = mockRequest()
      const updatedRequest = mockRequest({ name: 'Updated Request' })
      const collectionRequest = mockCollectionRequest({ request: originalRequest })
      const updatedCollectionRequest = mockCollectionRequest({ request: updatedRequest })

      useCollectionStore.setState({
        requests: { 'col-1': [collectionRequest] }
      })

      vi.mocked(window.api.db.updateRequest).mockResolvedValueOnce(updatedCollectionRequest)

      const { updateRequest } = useCollectionStore.getState()
      await updateRequest('colreq-1', updatedRequest)

      expect(window.api.db.updateRequest).toHaveBeenCalledWith('colreq-1', updatedRequest)
      expect(useCollectionStore.getState().requests['col-1'][0].request).toEqual(updatedRequest)
    })
  })

  describe('deleteRequest', () => {
    it('should delete a request', async () => {
      useCollectionStore.setState({
        requests: { 'col-1': [mockCollectionRequest(), mockCollectionRequest({ id: 'colreq-2' })] }
      })

      const { deleteRequest } = useCollectionStore.getState()
      await deleteRequest('colreq-1', 'col-1')

      expect(window.api.db.deleteRequest).toHaveBeenCalledWith('colreq-1')
      expect(useCollectionStore.getState().requests['col-1']).toHaveLength(1)
      expect(useCollectionStore.getState().requests['col-1'][0].id).toBe('colreq-2')
    })
  })

  describe('duplicateRequest', () => {
    it('should duplicate a request', async () => {
      const originalRequest = mockRequest()
      const collectionRequest = mockCollectionRequest({ request: originalRequest })
      const duplicatedCollectionRequest = mockCollectionRequest({
        id: 'colreq-2',
        request: { ...originalRequest, name: 'Test Request (copy)' }
      })

      useCollectionStore.setState({
        requests: { 'col-1': [collectionRequest] }
      })

      vi.mocked(window.api.db.saveRequest).mockResolvedValueOnce(duplicatedCollectionRequest)

      const { duplicateRequest } = useCollectionStore.getState()
      const result = await duplicateRequest('colreq-1', 'col-1')

      expect(window.api.db.saveRequest).toHaveBeenCalled()
      expect(useCollectionStore.getState().requests['col-1']).toHaveLength(2)
    })

    it('should throw error if request not found', async () => {
      useCollectionStore.setState({
        requests: { 'col-1': [] }
      })

      const { duplicateRequest } = useCollectionStore.getState()

      await expect(duplicateRequest('nonexistent', 'col-1')).rejects.toThrow('Request not found')
    })
  })

  describe('moveRequest', () => {
    it('should move a request to a different folder', async () => {
      const collectionRequest = mockCollectionRequest()
      const movedRequest = mockCollectionRequest({ folderId: 'folder-2' })

      useCollectionStore.setState({
        requests: { 'col-1': [collectionRequest] }
      })

      vi.mocked(window.api.db.moveRequest).mockResolvedValueOnce(movedRequest)

      const { moveRequest } = useCollectionStore.getState()
      await moveRequest('colreq-1', 'col-1', 'folder-2')

      expect(window.api.db.moveRequest).toHaveBeenCalledWith('colreq-1', 'folder-2')
      expect(useCollectionStore.getState().requests['col-1'][0].folderId).toBe('folder-2')
    })

    it('should move a request to root level', async () => {
      const collectionRequest = mockCollectionRequest({ folderId: 'folder-1' })
      const movedRequest = mockCollectionRequest({ folderId: undefined })

      useCollectionStore.setState({
        requests: { 'col-1': [collectionRequest] }
      })

      vi.mocked(window.api.db.moveRequest).mockResolvedValueOnce(movedRequest)

      const { moveRequest } = useCollectionStore.getState()
      await moveRequest('colreq-1', 'col-1', undefined)

      expect(window.api.db.moveRequest).toHaveBeenCalledWith('colreq-1', null)
    })
  })
})
