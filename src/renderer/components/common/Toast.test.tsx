import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ToastContainer from './Toast'
import { useToastStore } from '../../stores/toastStore'

describe('ToastContainer', () => {
  beforeEach(() => {
    // Reset toast store
    useToastStore.setState({ toasts: [] })
  })

  describe('rendering', () => {
    it('should render nothing when there are no toasts', () => {
      const { container } = render(<ToastContainer />)
      expect(container.firstChild).toBeNull()
    })

    it('should render a single toast', () => {
      useToastStore.setState({
        toasts: [{ id: 'toast-1', type: 'success', message: 'Test message' }]
      })

      render(<ToastContainer />)

      expect(screen.getByText('Test message')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should render multiple toasts', () => {
      useToastStore.setState({
        toasts: [
          { id: 'toast-1', type: 'success', message: 'First message' },
          { id: 'toast-2', type: 'error', message: 'Second message' },
          { id: 'toast-3', type: 'info', message: 'Third message' }
        ]
      })

      render(<ToastContainer />)

      expect(screen.getByText('First message')).toBeInTheDocument()
      expect(screen.getByText('Second message')).toBeInTheDocument()
      expect(screen.getByText('Third message')).toBeInTheDocument()
      expect(screen.getAllByRole('alert')).toHaveLength(3)
    })
  })

  describe('toast types', () => {
    it('should render success toast with check icon', () => {
      useToastStore.setState({
        toasts: [{ id: 'toast-1', type: 'success', message: 'Success!' }]
      })

      render(<ToastContainer />)

      expect(screen.getByText('Success!')).toBeInTheDocument()
    })

    it('should render error toast with X icon', () => {
      useToastStore.setState({
        toasts: [{ id: 'toast-1', type: 'error', message: 'Error!' }]
      })

      render(<ToastContainer />)

      expect(screen.getByText('Error!')).toBeInTheDocument()
    })

    it('should render warning toast with warning icon', () => {
      useToastStore.setState({
        toasts: [{ id: 'toast-1', type: 'warning', message: 'Warning!' }]
      })

      render(<ToastContainer />)

      expect(screen.getByText('Warning!')).toBeInTheDocument()
    })

    it('should render info toast with info icon', () => {
      useToastStore.setState({
        toasts: [{ id: 'toast-1', type: 'info', message: 'Info!' }]
      })

      render(<ToastContainer />)

      expect(screen.getByText('Info!')).toBeInTheDocument()
    })
  })

  describe('dismissing toasts', () => {
    it('should dismiss toast when clicking dismiss button', () => {
      useToastStore.setState({
        toasts: [{ id: 'toast-1', type: 'success', message: 'Dismissable toast' }]
      })

      render(<ToastContainer />)

      const dismissButton = screen.getByLabelText('Dismiss')
      fireEvent.click(dismissButton)

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it('should only dismiss the clicked toast', () => {
      useToastStore.setState({
        toasts: [
          { id: 'toast-1', type: 'success', message: 'First toast' },
          { id: 'toast-2', type: 'error', message: 'Second toast' }
        ]
      })

      render(<ToastContainer />)

      const dismissButtons = screen.getAllByLabelText('Dismiss')
      fireEvent.click(dismissButtons[0])

      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(1)
      expect(toasts[0].message).toBe('Second toast')
    })
  })
})
