/**
 * Protected Route Component
 * Redirects to login if not authenticated
 * Shows 403 if user doesn't have required role
 */
import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Card, CardContent } from '../components/ui'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: string[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, hasRole } = useAuth()

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Authenticated but insufficient role
  if (roles && !hasRole(roles)) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">
              You don't have permission to access this resource.
            </p>
            <div className="text-sm text-gray-500 mb-6">
              <p>Your role: <span className="font-semibold text-gray-300">{user?.role}</span></p>
              <p>Required roles: <span className="font-semibold text-gray-300">{roles.join(', ')}</span></p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-charcoal-800 hover:bg-charcoal-700 text-gray-200 rounded-md transition-colors"
            >
              Go Back
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Authenticated and has required role
  return <>{children}</>
}
