import type { ReactNode } from 'react'
import { Card, CardContent, Button, Input } from './ui'

interface TableToolbarProps {
  title: string
  search: string
  onSearchChange: (v: string) => void
  leftFilters?: ReactNode
  rightActions?: ReactNode
  onExportCsv?: () => void
  onRefresh?: () => void
  exportDisabled?: boolean
}

export function TableToolbar({
  title,
  search,
  onSearchChange,
  leftFilters,
  rightActions,
  onExportCsv,
  onRefresh,
  exportDisabled,
}: TableToolbarProps) {
  return (
    <Card variant="subtle">
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
          <div className="flex flex-wrap gap-2">
            {onExportCsv && (
              <Button variant="secondary" size="sm" onClick={onExportCsv} disabled={exportDisabled}>
                Export CSV
              </Button>
            )}
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            )}
            {rightActions}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
          />
          <div className="lg:col-span-2">{leftFilters}</div>
        </div>
      </CardContent>
    </Card>
  )
}
