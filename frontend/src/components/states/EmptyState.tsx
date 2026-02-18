/**
 * EmptyState - Enterprise empty data display
 */

import { Card, CardContent } from '../ui'

interface EmptyStateProps {
  title?: string
  message?: string
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ 
  title = 'No Data Available',
  message = 'There is no data to display at this time.',
  icon,
  className 
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="text-center py-12">
          {icon || (
            <svg
              className="mx-auto h-16 w-16 text-gray-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          )}
          <h3 className="text-xl font-semibold text-gray-200 mb-2">
            {title}
          </h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {message}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
