import type { ReactNode } from 'react'
import { AuthProvider } from '../features/auth/AuthContext'
import { ToastProvider } from '../components/ui'
import { ChatbaseWidget } from '../components/ChatbaseWidget'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <ChatbaseWidget />
        {children}
      </AuthProvider>
    </ToastProvider>
  )
}
