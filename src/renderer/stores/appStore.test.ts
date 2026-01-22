import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from './appStore'

describe('appStore', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({ tabs: [], activeTab: null })
  })

  describe('createNewTab', () => {
    it('should create a new tab with default values', () => {
      const { createNewTab } = useAppStore.getState()

      createNewTab()

      const { tabs, activeTab } = useAppStore.getState()
      expect(tabs).toHaveLength(1)
      expect(tabs[0].title).toBe('Untitled')
      expect(tabs[0].isDirty).toBe(false)
      expect(tabs[0].isLoading).toBe(false)
      expect(tabs[0].request.type).toBe('http')
      expect(activeTab).toBe(tabs[0].id)
    })

    it('should create multiple tabs', () => {
      const { createNewTab } = useAppStore.getState()

      createNewTab()
      createNewTab()
      createNewTab()

      const { tabs } = useAppStore.getState()
      expect(tabs).toHaveLength(3)
    })
  })

  describe('closeTab', () => {
    it('should close a tab', () => {
      const { createNewTab, closeTab } = useAppStore.getState()

      createNewTab()
      createNewTab()

      const { tabs } = useAppStore.getState()
      closeTab(tabs[0].id)

      const updatedTabs = useAppStore.getState().tabs
      expect(updatedTabs).toHaveLength(1)
    })

    it('should update active tab when closing active tab', () => {
      const { createNewTab, closeTab } = useAppStore.getState()

      createNewTab()
      createNewTab()

      const { tabs, activeTab } = useAppStore.getState()
      const firstTabId = tabs[0].id
      const secondTabId = tabs[1].id

      // Second tab should be active after creation
      expect(activeTab).toBe(secondTabId)

      // Close active tab
      closeTab(secondTabId)

      // First tab should now be active
      expect(useAppStore.getState().activeTab).toBe(firstTabId)
    })

    it('should set activeTab to null when closing last tab', () => {
      const { createNewTab, closeTab } = useAppStore.getState()

      createNewTab()

      const { tabs } = useAppStore.getState()
      closeTab(tabs[0].id)

      expect(useAppStore.getState().tabs).toHaveLength(0)
      expect(useAppStore.getState().activeTab).toBeNull()
    })
  })

  describe('updateTab', () => {
    it('should update tab properties', () => {
      const { createNewTab, updateTab } = useAppStore.getState()

      createNewTab()

      const { tabs } = useAppStore.getState()
      updateTab(tabs[0].id, { title: 'New Title', isDirty: true })

      const updatedTabs = useAppStore.getState().tabs
      expect(updatedTabs[0].title).toBe('New Title')
      expect(updatedTabs[0].isDirty).toBe(true)
    })
  })

  describe('duplicateTab', () => {
    it('should duplicate a tab', () => {
      const { createNewTab, updateTab, duplicateTab } = useAppStore.getState()

      createNewTab()

      const { tabs } = useAppStore.getState()
      updateTab(tabs[0].id, { title: 'Original Tab' })

      duplicateTab(tabs[0].id)

      const updatedTabs = useAppStore.getState().tabs
      expect(updatedTabs).toHaveLength(2)
      expect(updatedTabs[1].title).toBe('Original Tab (copy)')
      expect(updatedTabs[1].isDirty).toBe(false)
      expect(updatedTabs[1].isLoading).toBe(false)
    })

    it('should set duplicated tab as active', () => {
      const { createNewTab, duplicateTab } = useAppStore.getState()

      createNewTab()

      const { tabs } = useAppStore.getState()
      duplicateTab(tabs[0].id)

      const updatedTabs = useAppStore.getState().tabs
      expect(useAppStore.getState().activeTab).toBe(updatedTabs[1].id)
    })
  })

  describe('closeOtherTabs', () => {
    it('should close all tabs except the specified one', () => {
      const { createNewTab, closeOtherTabs } = useAppStore.getState()

      createNewTab()
      createNewTab()
      createNewTab()

      const { tabs } = useAppStore.getState()
      const keepTabId = tabs[1].id

      closeOtherTabs(keepTabId)

      const updatedTabs = useAppStore.getState().tabs
      expect(updatedTabs).toHaveLength(1)
      expect(updatedTabs[0].id).toBe(keepTabId)
    })
  })

  describe('closeAllTabs', () => {
    it('should close all tabs', () => {
      const { createNewTab, closeAllTabs } = useAppStore.getState()

      createNewTab()
      createNewTab()
      createNewTab()

      closeAllTabs()

      expect(useAppStore.getState().tabs).toHaveLength(0)
      expect(useAppStore.getState().activeTab).toBeNull()
    })
  })

  describe('reorderTabs', () => {
    it('should reorder tabs', () => {
      const { createNewTab, updateTab, reorderTabs } = useAppStore.getState()

      createNewTab()
      createNewTab()
      createNewTab()

      const { tabs } = useAppStore.getState()
      updateTab(tabs[0].id, { title: 'Tab 1' })
      updateTab(tabs[1].id, { title: 'Tab 2' })
      updateTab(tabs[2].id, { title: 'Tab 3' })

      // Move tab at index 0 to index 2
      reorderTabs(0, 2)

      const updatedTabs = useAppStore.getState().tabs
      expect(updatedTabs[0].title).toBe('Tab 2')
      expect(updatedTabs[1].title).toBe('Tab 3')
      expect(updatedTabs[2].title).toBe('Tab 1')
    })
  })
})
