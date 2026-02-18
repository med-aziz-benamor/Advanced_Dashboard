import { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Badge } from './Badge'
import { Sparkline } from '../charts'

interface KpiCardProps {
  label: string
  value: string | number
  trend?: {
    direction: 'up' | 'down'
    value: string
  }
  status?: 'healthy' | 'warn' | 'critical' | 'info'
  icon?: ReactNode
  sparkline?: number[]
  className?: string
}

export function KpiCard({
  label,
  value,
  trend,
  status = 'info',
  icon,
  sparkline,
  className,
}: KpiCardProps) {
  const statusColors = {
    healthy: 'text-green-400',
    warn: 'text-yellow-400',
    critical: 'text-red-400',
    info: 'text-blue-400',
  }

  const statusBadgeVariants = {
    healthy: 'success' as const,
    warn: 'warning' as const,
    critical: 'danger' as const,
    info: 'info' as const,
  }

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
  }

  const sparklineColors = {
    healthy: '#10b981',
    warn: '#f59e0b',
    critical: '#ef4444',
    info: '#60a5fa',
  }

  return (
    <div
      className={cn(
        'bg-charcoal-800/50 border border-gray-700 rounded-lg p-6',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-400 font-medium">{label}</p>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className={cn('text-3xl font-bold', statusColors[status])}>
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'text-xs mt-1 flex items-center',
                trendColors[trend.direction]
              )}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <Badge variant={statusBadgeVariants[status]}>{status}</Badge>
      </div>

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <Sparkline data={sparkline} color={sparklineColors[status]} height={35} />
        </div>
      )}
    </div>
  )
}
