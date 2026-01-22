import { useToastStore, Toast as ToastType } from '../../stores/toastStore'

const typeStyles: Record<ToastType['type'], { bg: string; icon: string; iconColor: string }> = {
  success: {
    bg: 'bg-green-900/90 border-green-700',
    icon: '✓',
    iconColor: 'text-green-400'
  },
  error: {
    bg: 'bg-red-900/90 border-red-700',
    icon: '✕',
    iconColor: 'text-red-400'
  },
  warning: {
    bg: 'bg-yellow-900/90 border-yellow-700',
    icon: '⚠',
    iconColor: 'text-yellow-400'
  },
  info: {
    bg: 'bg-blue-900/90 border-blue-700',
    icon: 'ℹ',
    iconColor: 'text-blue-400'
  }
}

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useToastStore()
  const style = typeStyles[toast.type]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm ${style.bg}`}
      role="alert"
    >
      <span className={`text-lg ${style.iconColor}`}>{style.icon}</span>
      <p className="text-sm text-white flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-gray-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
