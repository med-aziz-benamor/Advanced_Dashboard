import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Toast, type ToastMessage, type ToastType } from './Toast'

interface ToastInput {
  type?: ToastType
  title: string
  message?: string
  durationMs?: number
}

interface ToastContextValue {
  toast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const seqRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const pushToast = useCallback((input: ToastInput) => {
    seqRef.current += 1
    const entry: ToastMessage = {
      id: `toast-${Date.now()}-${seqRef.current}`,
      type: input.type ?? 'info',
      title: input.title,
      message: input.message,
      durationMs: input.durationMs ?? 3500,
    }
    setToasts((prev) => [...prev, entry])
  }, [])

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setToasts((prev) => {
        if (prev.length === 0) return prev
        return prev.slice(0, prev.length - 1)
      })
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ toast: pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex max-h-[80vh] flex-col gap-2 overflow-y-auto">
        {toasts.map((entry) => (
          <Toast key={entry.id} toast={entry} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
