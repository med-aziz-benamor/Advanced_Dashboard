import { useMemo, useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, DataTable, useToast } from '../components/ui'
import { EmptyState, ErrorState, LoadingState } from '../components/states'
import { usePollingApi } from '../hooks/usePollingApi'
import { fetchAudit } from '../api/endpoints'
import type { AuditEvent } from '../api/types'
import { TableToolbar } from '../components/TableToolbar'
import { downloadCsv } from '../lib/csv'

const PAGE_SIZE = 25

function roleVariant(role: string) {
  if (role === 'admin') return 'danger' as const
  if (role === 'operator') return 'info' as const
  return 'neutral' as const
}

function actionVariant(action: string) {
  if (action.includes('clear') || action.includes('resolve') || action.includes('apply')) return 'warning' as const
  if (action.includes('dismiss')) return 'neutral' as const
  return 'info' as const
}

export default function Audit() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, error, refetch } = usePollingApi(
    (signal) => fetchAudit(200, undefined, signal),
    {
      intervalMs: 15000,
      immediate: true,
      pauseWhenHidden: true,
    }
  )

  const filtered = useMemo(() => {
    const rows = data?.events ?? []
    const query = search.trim().toLowerCase()
    if (!query) return rows

    return rows.filter((item) => {
      return [
        item.actor_email,
        item.actor_role,
        item.action,
        item.target_id || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [data?.events, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const exportCsv = () => {
    downloadCsv('audit-events.csv', pagedRows)
    toast({ type: 'success', title: 'Audit exported', message: `Exported ${pagedRows.length} rows.` })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Audit Trail</h1>
        <p className="text-gray-400 mt-2 text-sm">Mutation activity log for operational actions and mode changes.</p>
      </div>

      {loading && <LoadingState variant="table" />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && (
        <>
          <TableToolbar
            title="Audit Events"
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            onExportCsv={exportCsv}
            onRefresh={refetch}
            exportDisabled={pagedRows.length === 0}
          />

          {filtered.length === 0 ? (
            <EmptyState title="No Audit Events" message="No audit events match the current search query." />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">Events</h3>
                  <Badge variant="neutral">{filtered.length} events</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<AuditEvent>
                  columns={[
                    {
                      key: 'ts',
                      header: 'Timestamp',
                      render: (row) => new Date(row.ts).toLocaleString(),
                    },
                    { key: 'actor_email', header: 'Actor' },
                    {
                      key: 'actor_role',
                      header: 'Role',
                      render: (row) => <Badge variant={roleVariant(row.actor_role)}>{row.actor_role}</Badge>,
                    },
                    {
                      key: 'action',
                      header: 'Action',
                      render: (row) => <Badge variant={actionVariant(row.action)}>{row.action}</Badge>,
                    },
                    {
                      key: 'target_id',
                      header: 'Target ID',
                      render: (row) => row.target_id || 'N/A',
                    },
                  ]}
                  rows={pagedRows}
                />
              </CardContent>
            </Card>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
