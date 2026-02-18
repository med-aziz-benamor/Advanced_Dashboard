import { useEffect } from 'react'
import { Button } from './Button'
import { cn } from '../../lib/cn'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
  durationMs: number
}

interface ToastProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

const toneStyles: Record<ToastType, string> = {
  success: 'border-green-600/60 bg-green-950/40',
  error: 'border-red-600/60 bg-red-950/40',
  info: 'border-blue-600/60 bg-blue-950/40',
  warning: 'border-amber-600/60 bg-amber-950/40',
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss(toast.id)
    }, toast.durationMs)

    return () => window.clearTimeout(timer)
  }, [onDismiss, toast.durationMs, toast.id])

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-96 max-w-[calc(100vw-2rem)] rounded-lg border p-3 shadow-xl backdrop-blur',
        toneStyles[toast.type]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-100">{toast.title}</p>
          {toast.message && <p className="mt-1 text-xs text-gray-300">{toast.message}</p>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="px-2 py-1 text-xs"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          Close
        </Button>
      </div>
    </div>
  )
}
