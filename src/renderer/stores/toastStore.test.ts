import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToastStore } from './toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    // Reset store state
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('addToast', () => {
    it('should add a toast to the store', () => {
      const { addToast, toasts } = useToastStore.getState()

      addToast({ type: 'success', message: 'Test message' })

      const updatedToasts = useToastStore.getState().toasts
      expect(updatedToasts).toHaveLength(1)
      expect(updatedToasts[0].type).toBe('success')
      expect(updatedToasts[0].message).toBe('Test message')
    })

    it('should auto-remove toast after duration', () => {
      const { addToast } = useToastStore.getState()

      addToast({ type: 'info', message: 'Auto-remove', duration: 2000 })

      expect(useToastStore.getState().toasts).toHaveLength(1)

      vi.advanceTimersByTime(2000)

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it('should not auto-remove toast with duration 0', () => {
      const { addToast } = useToastStore.getState()

      addToast({ type: 'info', message: 'Persistent', duration: 0 })

      vi.advanceTimersByTime(10000)

      expect(useToastStore.getState().toasts).toHaveLength(1)
    })
  })

  describe('removeToast', () => {
    it('should remove a specific toast', () => {
      const { addToast, removeToast } = useToastStore.getState()

      addToast({ type: 'success', message: 'First', duration: 0 })
      addToast({ type: 'error', message: 'Second', duration: 0 })

      const toasts = useToastStore.getState().toasts
      expect(toasts).toHaveLength(2)

      removeToast(toasts[0].id)

      const updatedToasts = useToastStore.getState().toasts
      expect(updatedToasts).toHaveLength(1)
      expect(updatedToasts[0].message).toBe('Second')
    })
  })

  describe('convenience methods', () => {
    it('should add success toast', () => {
      const { success } = useToastStore.getState()

      success('Success message')

      const toasts = useToastStore.getState().toasts
      expect(toasts).toHaveLength(1)
      expect(toasts[0].type).toBe('success')
    })

    it('should add error toast with longer duration', () => {
      const { error } = useToastStore.getState()

      error('Error message')

      const toasts = useToastStore.getState().toasts
      expect(toasts).toHaveLength(1)
      expect(toasts[0].type).toBe('error')

      // Error toasts should have 6000ms duration
      vi.advanceTimersByTime(5000)
      expect(useToastStore.getState().toasts).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it('should add warning toast', () => {
      const { warning } = useToastStore.getState()

      warning('Warning message')

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].type).toBe('warning')
    })

    it('should add info toast', () => {
      const { info } = useToastStore.getState()

      info('Info message')

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].type).toBe('info')
    })
  })
})
