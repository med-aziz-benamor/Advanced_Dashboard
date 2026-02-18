/**
 * LoadingState - Enterprise loading skeleton component
 */

import { Card, CardContent } from '../ui'
import { Skeleton } from '../ui/Skeleton'

interface LoadingStateProps {
  rows?: number
  variant?: 'kpi' | 'table' | 'card'
  className?: string
}

export function LoadingState({ rows = 3, variant = 'card', className }: LoadingStateProps) {
  if (variant === 'kpi') {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton variant="text" className="mb-2" />
                <Skeleton variant="text" className="h-8 w-24 mb-1" />
                <Skeleton variant="text" className="w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <Card className={className}>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default card variant
  return (
    <Card className={className}>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} variant="text" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
