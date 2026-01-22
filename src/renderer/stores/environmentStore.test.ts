import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEnvironmentStore } from './environmentStore'
import type { Environment, EnvironmentVariable } from '../../shared/types/models'

// Helper to create mock environments
const mockEnvironment = (overrides: Partial<Environment> = {}): Environment => ({
  id: 'env-1',
  name: 'Development',
  variables: [],
  isActive: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
})

const mockVariable = (overrides: Partial<EnvironmentVariable> = {}): EnvironmentVariable => ({
  key: 'API_URL',
  value: 'https://api.example.com',
  enabled: true,
  ...overrides
})

describe('environmentStore', () => {
  beforeEach(() => {
    // Reset store state
    useEnvironmentStore.setState({
      environments: [],
      activeEnvironment: null,
      isLoading: false
    })
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('loadEnvironments', () => {
    it('should load environments from API', async () => {
      const environments = [
        mockEnvironment(),
        mockEnvironment({ id: 'env-2', name: 'Production' })
      ]
      vi.mocked(window.api.db.getEnvironments).mockResolvedValueOnce(environments)

      const { loadEnvironments } = useEnvironmentStore.getState()
      await loadEnvironments()

      const state = useEnvironmentStore.getState()
      expect(state.environments).toEqual(environments)
      expect(state.isLoading).toBe(false)
      expect(state.activeEnvironment).toBeNull()
    })

    it('should set active environment if one is marked active', async () => {
      const environments = [
        mockEnvironment(),
        mockEnvironment({ id: 'env-2', name: 'Production', isActive: true })
      ]
      vi.mocked(window.api.db.getEnvironments).mockResolvedValueOnce(environments)

      const { loadEnvironments } = useEnvironmentStore.getState()
      await loadEnvironments()

      const state = useEnvironmentStore.getState()
      expect(state.activeEnvironment).toEqual(environments[1])
    })

    it('should set isLoading while loading', async () => {
      vi.mocked(window.api.db.getEnvironments).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      const { loadEnvironments } = useEnvironmentStore.getState()
      const loadPromise = loadEnvironments()

      expect(useEnvironmentStore.getState().isLoading).toBe(true)

      await loadPromise
      expect(useEnvironmentStore.getState().isLoading).toBe(false)
    })
  })

  describe('createEnvironment', () => {
    it('should create an environment and add to state', async () => {
      const newEnvironment = mockEnvironment()
      vi.mocked(window.api.db.createEnvironment).mockResolvedValueOnce(newEnvironment)

      const { createEnvironment } = useEnvironmentStore.getState()
      const result = await createEnvironment('Development')

      expect(window.api.db.createEnvironment).toHaveBeenCalledWith('Development')
      expect(result).toEqual(newEnvironment)
      expect(useEnvironmentStore.getState().environments).toContainEqual(newEnvironment)
    })
  })

  describe('updateEnvironment', () => {
    it('should update an environment', async () => {
      const environment = mockEnvironment()
      useEnvironmentStore.setState({ environments: [environment] })

      const { updateEnvironment } = useEnvironmentStore.getState()
      await updateEnvironment('env-1', { name: 'Staging' })

      expect(window.api.db.updateEnvironment).toHaveBeenCalledWith('env-1', { name: 'Staging' })
      expect(useEnvironmentStore.getState().environments[0].name).toBe('Staging')
    })

    it('should update active environment if it is the one being updated', async () => {
      const environment = mockEnvironment({ isActive: true })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const { updateEnvironment } = useEnvironmentStore.getState()
      await updateEnvironment('env-1', { name: 'Staging' })

      expect(useEnvironmentStore.getState().activeEnvironment?.name).toBe('Staging')
    })
  })

  describe('deleteEnvironment', () => {
    it('should delete an environment', async () => {
      const environments = [mockEnvironment(), mockEnvironment({ id: 'env-2' })]
      useEnvironmentStore.setState({ environments })

      const { deleteEnvironment } = useEnvironmentStore.getState()
      await deleteEnvironment('env-1')

      expect(window.api.db.deleteEnvironment).toHaveBeenCalledWith('env-1')
      expect(useEnvironmentStore.getState().environments).toHaveLength(1)
      expect(useEnvironmentStore.getState().environments[0].id).toBe('env-2')
    })

    it('should clear active environment if deleting the active one', async () => {
      const environment = mockEnvironment({ isActive: true })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const { deleteEnvironment } = useEnvironmentStore.getState()
      await deleteEnvironment('env-1')

      expect(useEnvironmentStore.getState().activeEnvironment).toBeNull()
    })

    it('should not clear active environment if deleting a different one', async () => {
      const activeEnv = mockEnvironment({ isActive: true })
      const otherEnv = mockEnvironment({ id: 'env-2' })
      useEnvironmentStore.setState({
        environments: [activeEnv, otherEnv],
        activeEnvironment: activeEnv
      })

      const { deleteEnvironment } = useEnvironmentStore.getState()
      await deleteEnvironment('env-2')

      expect(useEnvironmentStore.getState().activeEnvironment).toEqual(activeEnv)
    })
  })

  describe('setActiveEnvironment', () => {
    it('should set the active environment', async () => {
      const environments = [
        mockEnvironment(),
        mockEnvironment({ id: 'env-2', name: 'Production' })
      ]
      useEnvironmentStore.setState({ environments })

      const { setActiveEnvironment } = useEnvironmentStore.getState()
      await setActiveEnvironment('env-2')

      expect(window.api.db.setActiveEnvironment).toHaveBeenCalledWith('env-2')
      const state = useEnvironmentStore.getState()
      expect(state.activeEnvironment?.id).toBe('env-2')
      expect(state.environments[0].isActive).toBe(false)
      expect(state.environments[1].isActive).toBe(true)
    })

    it('should clear active environment when null is passed', async () => {
      const environment = mockEnvironment({ isActive: true })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const { setActiveEnvironment } = useEnvironmentStore.getState()
      await setActiveEnvironment(null)

      expect(window.api.db.setActiveEnvironment).toHaveBeenCalledWith(null)
      const state = useEnvironmentStore.getState()
      expect(state.activeEnvironment).toBeNull()
      expect(state.environments[0].isActive).toBe(false)
    })
  })

  describe('updateVariables', () => {
    it('should update variables for an environment', async () => {
      const environment = mockEnvironment()
      useEnvironmentStore.setState({ environments: [environment] })

      const variables: EnvironmentVariable[] = [
        mockVariable(),
        mockVariable({ key: 'API_KEY', value: 'secret123' })
      ]

      const { updateVariables } = useEnvironmentStore.getState()
      await updateVariables('env-1', variables)

      expect(window.api.db.updateEnvironment).toHaveBeenCalledWith('env-1', { variables })
      expect(useEnvironmentStore.getState().environments[0].variables).toEqual(variables)
    })

    it('should update active environment variables if it is the one being updated', async () => {
      const environment = mockEnvironment({ isActive: true })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const variables: EnvironmentVariable[] = [mockVariable()]

      const { updateVariables } = useEnvironmentStore.getState()
      await updateVariables('env-1', variables)

      expect(useEnvironmentStore.getState().activeEnvironment?.variables).toEqual(variables)
    })
  })

  describe('applyScriptUpdates', () => {
    it('should do nothing when no active environment', async () => {
      useEnvironmentStore.setState({
        environments: [],
        activeEnvironment: null
      })

      const { applyScriptUpdates } = useEnvironmentStore.getState()
      await applyScriptUpdates({ token: 'abc123' })

      expect(window.api.db.updateEnvironment).not.toHaveBeenCalled()
    })

    it('should do nothing when updates are empty', async () => {
      const environment = mockEnvironment({ isActive: true })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const { applyScriptUpdates } = useEnvironmentStore.getState()
      await applyScriptUpdates({})

      expect(window.api.db.updateEnvironment).not.toHaveBeenCalled()
    })

    it('should add new variables from script updates', async () => {
      const environment = mockEnvironment({ isActive: true, variables: [] })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const { applyScriptUpdates } = useEnvironmentStore.getState()
      await applyScriptUpdates({ token: 'abc123', user_id: '42' })

      expect(window.api.db.updateEnvironment).toHaveBeenCalled()
      const state = useEnvironmentStore.getState()
      expect(state.activeEnvironment?.variables).toHaveLength(2)
      expect(state.activeEnvironment?.variables.find(v => v.key === 'token')?.value).toBe('abc123')
      expect(state.activeEnvironment?.variables.find(v => v.key === 'user_id')?.value).toBe('42')
    })

    it('should update existing variables from script updates', async () => {
      const existingVar = mockVariable({ id: 'var-1', key: 'token', value: 'old-token' })
      const environment = mockEnvironment({ isActive: true, variables: [existingVar] })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const { applyScriptUpdates } = useEnvironmentStore.getState()
      await applyScriptUpdates({ token: 'new-token' })

      const state = useEnvironmentStore.getState()
      expect(state.activeEnvironment?.variables).toHaveLength(1)
      expect(state.activeEnvironment?.variables[0].value).toBe('new-token')
      expect(state.activeEnvironment?.variables[0].id).toBe('var-1') // Same ID preserved
    })

    it('should disable variables when set to empty string (unset)', async () => {
      const existingVar = mockVariable({ id: 'var-1', key: 'token', value: 'abc123', enabled: true })
      const environment = mockEnvironment({ isActive: true, variables: [existingVar] })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const { applyScriptUpdates } = useEnvironmentStore.getState()
      await applyScriptUpdates({ token: '' })

      const state = useEnvironmentStore.getState()
      expect(state.activeEnvironment?.variables[0].enabled).toBe(false)
    })

    it('should not add new variables with empty value', async () => {
      const environment = mockEnvironment({ isActive: true, variables: [] })
      useEnvironmentStore.setState({
        environments: [environment],
        activeEnvironment: environment
      })

      const { applyScriptUpdates } = useEnvironmentStore.getState()
      await applyScriptUpdates({ token: '', user_id: '42' })

      const state = useEnvironmentStore.getState()
      expect(state.activeEnvironment?.variables).toHaveLength(1)
      expect(state.activeEnvironment?.variables[0].key).toBe('user_id')
    })
  })
})
