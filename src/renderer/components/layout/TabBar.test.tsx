import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TabBar from './TabBar'
import { useAppStore } from '../../stores/appStore'
import { useEnvironmentStore } from '../../stores/environmentStore'
import type { Tab, Environment } from '../../../shared/types/models'

// Helper to create a mock tab
const mockTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: 'tab-1',
  title: 'Test Request',
  isDirty: false,
  isLoading: false,
  request: {
    id: 'req-1',
    type: 'http',
    name: 'Test Request',
    url: 'https://api.example.com',
    method: 'GET',
    headers: [],
    params: [],
    body: { type: 'none' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  ...overrides
})

const mockEnvironment = (overrides: Partial<Environment> = {}): Environment => ({
  id: 'env-1',
  name: 'Development',
  variables: [],
  isActive: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
})

describe('TabBar', () => {
  beforeEach(() => {
    // Reset stores
    useAppStore.setState({
      tabs: [],
      activeTab: null
    })
    useEnvironmentStore.setState({
      environments: [],
      activeEnvironment: null,
      isLoading: false
    })
  })

  describe('rendering', () => {
    it('should render without tabs', () => {
      render(<TabBar />)
      expect(screen.getByTitle('New Tab (right-click for options)')).toBeInTheDocument()
    })

    it('should render a single tab', () => {
      const tab = mockTab()
      useAppStore.setState({ tabs: [tab], activeTab: tab.id })

      render(<TabBar />)

      expect(screen.getByText('Test Request')).toBeInTheDocument()
    })

    it('should render multiple tabs', () => {
      const tabs = [
        mockTab({ id: 'tab-1', title: 'First Request' }),
        mockTab({ id: 'tab-2', title: 'Second Request' }),
        mockTab({ id: 'tab-3', title: 'Third Request' })
      ]
      useAppStore.setState({ tabs, activeTab: 'tab-1' })

      render(<TabBar />)

      expect(screen.getByText('First Request')).toBeInTheDocument()
      expect(screen.getByText('Second Request')).toBeInTheDocument()
      expect(screen.getByText('Third Request')).toBeInTheDocument()
    })

    it('should show dirty indicator for modified tabs', () => {
      const tab = mockTab({ isDirty: true })
      useAppStore.setState({ tabs: [tab], activeTab: tab.id })

      render(<TabBar />)

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('should show HTTP method badge', () => {
      const tab = mockTab()
      useAppStore.setState({ tabs: [tab], activeTab: tab.id })

      render(<TabBar />)

      expect(screen.getByText('GET')).toBeInTheDocument()
    })
  })

  describe('tab interactions', () => {
    it('should call setActiveTab when clicking a tab', () => {
      const setActiveTabSpy = vi.fn()
      const tabs = [
        mockTab({ id: 'tab-1', title: 'First' }),
        mockTab({ id: 'tab-2', title: 'Second' })
      ]
      useAppStore.setState({
        tabs,
        activeTab: 'tab-1',
        setActiveTab: setActiveTabSpy
      })

      render(<TabBar />)

      // Click on the second tab's title
      fireEvent.click(screen.getByText('Second'))

      expect(setActiveTabSpy).toHaveBeenCalledWith('tab-2')
    })

    it('should call createNewTab when clicking new tab button', () => {
      const createNewTabSpy = vi.fn()
      useAppStore.setState({ createNewTab: createNewTabSpy })

      render(<TabBar />)

      fireEvent.click(screen.getByTitle('New Tab (right-click for options)'))

      expect(createNewTabSpy).toHaveBeenCalled()
    })
  })

  describe('environment selector', () => {
    it('should show environment selector', () => {
      render(<TabBar />)

      expect(screen.getByText('Env:')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should show "No Environment" as default option', () => {
      render(<TabBar />)

      expect(screen.getByText('No Environment')).toBeInTheDocument()
    })

    it('should list available environments', () => {
      const environments = [
        mockEnvironment({ id: 'env-1', name: 'Development' }),
        mockEnvironment({ id: 'env-2', name: 'Production' })
      ]
      useEnvironmentStore.setState({ environments })

      render(<TabBar />)

      expect(screen.getByText('Development')).toBeInTheDocument()
      expect(screen.getByText('Production')).toBeInTheDocument()
    })

    it('should show active environment as selected', () => {
      const environments = [
        mockEnvironment({ id: 'env-1', name: 'Development' }),
        mockEnvironment({ id: 'env-2', name: 'Production', isActive: true })
      ]
      useEnvironmentStore.setState({
        environments,
        activeEnvironment: environments[1]
      })

      render(<TabBar />)

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('env-2')
    })

    it('should call setActiveEnvironment when changing environment', () => {
      const setActiveEnvironmentSpy = vi.fn()
      const environments = [
        mockEnvironment({ id: 'env-1', name: 'Development' }),
        mockEnvironment({ id: 'env-2', name: 'Production' })
      ]
      useEnvironmentStore.setState({
        environments,
        setActiveEnvironment: setActiveEnvironmentSpy
      })

      render(<TabBar />)

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'env-2' } })

      expect(setActiveEnvironmentSpy).toHaveBeenCalledWith('env-2')
    })
  })
})
