/**
 * ErrorState - Enterprise error display with retry
 */

import { Card, CardHeader, CardContent, Button } from '../ui'

interface ErrorStateProps {
  error: Error
  onRetry?: () => void
  title?: string
  className?: string
}

export function ErrorState({ 
  error, 
  onRetry, 
  title = 'Error Loading Data',
  className 
}: ErrorStateProps) {
  return (
    <Card className={className} variant="subtle">
      <CardHeader>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-red-950/30 border border-red-900/50 rounded p-4">
            <p className="text-sm text-red-400 font-medium mb-1">
              {error.message || 'An unexpected error occurred'}
            </p>
            <p className="text-xs text-red-300/70">
              Please try again or contact support if the problem persists.
            </p>
          </div>
          {onRetry && (
            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
