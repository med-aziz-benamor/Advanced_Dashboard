import { ReactNode } from 'react'
import { Card, CardHeader, CardContent } from '../ui'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
