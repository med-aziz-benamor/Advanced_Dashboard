import { useMemo, useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, DataTable, KpiCard, Select, useToast } from '../components/ui'
import { EmptyState, ErrorState, LoadingState } from '../components/states'
import { usePollingApi } from '../hooks/usePollingApi'
import { ackAlert, clearAlerts, fetchAlerts, resolveAlert } from '../api/endpoints'
import type { AlertItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { TableToolbar } from '../components/TableToolbar'
import { downloadCsv } from '../lib/csv'

type AlertStatusFilter = 'all' | 'active' | 'acknowledged' | 'resolved'
type AlertSeverityFilter = 'all' | 'critical' | 'warning' | 'info'
type RowAction = 'ack' | 'resolve'

const PAGE_SIZE = 20

function badgeForSeverity(severity?: string) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'info' as const
}

function badgeForStatus(status?: string) {
  if (status === 'active') return 'warning' as const
  if (status === 'acknowledged') return 'info' as const
  if (status === 'resolved') return 'success' as const
  return 'neutral' as const
}

function riskBadgeVariant(level?: string) {
  if (level === 'critical') return 'danger' as const
  if (level === 'high') return 'danger' as const
  if (level === 'moderate') return 'warning' as const
  if (level === 'low') return 'info' as const
  return 'neutral' as const
}

function normalizeRiskLevel(alert: AlertItem): 'high' | 'moderate' | 'low' | 'critical' | 'unknown' {
  const level = alert.sla_risk?.risk_level
  if (level) return level

  const msg = `${alert.title || ''} ${alert.type || ''}`.toLowerCase()
  if (msg.includes('critical')) return 'critical'
  if (msg.includes('high')) return 'high'
  if (msg.includes('moderate')) return 'moderate'
  if (msg.includes('low')) return 'low'
  return 'unknown'
}

function resourceText(alert: AlertItem): string {
  const resource: any = alert.resource ?? alert.entity
  if (!resource) return 'cluster'

  const parts: string[] = []
  if (resource.namespace) parts.push(`ns:${resource.namespace}`)
  if (resource.pod) parts.push(`pod:${resource.pod}`)
  if (resource.node) parts.push(`node:${resource.node}`)
  if (resource.deployment) parts.push(`deploy:${resource.deployment}`)
  if (resource.cluster && parts.length === 0) parts.push(`cluster:${resource.cluster}`)
  if (resource.target && parts.length === 0) parts.push(`target:${resource.target}`)

  return parts.length > 0 ? parts.join(', ') : 'cluster'
}

function toRiskObject(alert: AlertItem) {
  if (alert.sla_risk) return alert.sla_risk

  if (alert.type === 'sla_risk') {
    const msg = (alert as any).message || ''
    const scoreMatch = msg.match(/score\s+(\d+)/i)
    const ttiMatch = msg.match(/impact in\s+(\d+)/i)
    const inferredLevel = normalizeRiskLevel(alert)

    return {
      risk_score: scoreMatch ? Number(scoreMatch[1]) : 0,
      risk_level: inferredLevel === 'unknown' || inferredLevel === 'critical' ? 'high' : inferredLevel,
      time_to_impact_minutes: ttiMatch ? Number(ttiMatch[1]) : undefined,
      drivers: Array.isArray(alert.meta?.drivers) ? (alert.meta?.drivers as string[]) : [],
      confidence:
        typeof alert.meta?.confidence === 'number'
          ? String(alert.meta.confidence)
          : typeof alert.meta?.confidence === 'string'
            ? alert.meta.confidence
            : undefined,
    }
  }

  return undefined
}

export default function Alerts() {
  const { hasRole } = useAuth()
  const { toast } = useToast()
  const [selected, setSelected] = useState<AlertItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverityFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rowLoading, setRowLoading] = useState<Record<string, RowAction | undefined>>({})
  const [clearLoading, setClearLoading] = useState(false)

  const { data, loading, error, refetch } = usePollingApi(fetchAlerts, {
    intervalMs: 15000,
    immediate: true,
    pauseWhenHidden: true,
  })

  const rows = data?.alerts ?? []

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((alert) => {
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false

      if (!query) return true

      const riskLevel = normalizeRiskLevel(alert)
      const haystack = [
        alert.title,
        alert.type,
        alert.status,
        alert.severity,
        resourceText(alert),
        riskLevel,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [rows, severityFilter, statusFilter, search])

  const kpis = useMemo(() => {
    const active = filtered.filter((a) => a.status === 'active').length
    const critical = filtered.filter((a) => a.severity === 'critical').length

    const levels = filtered.map((a) => normalizeRiskLevel(a)).filter((l) => l !== 'unknown')

    const rank: Record<string, number> = { low: 1, moderate: 2, high: 3, critical: 4 }

    const highest = levels.reduce<'low' | 'moderate' | 'high' | 'critical' | 'unknown'>((acc, level) => {
      if (acc === 'unknown') return level as 'low' | 'moderate' | 'high' | 'critical'
      return rank[level] > rank[acc] ? (level as 'low' | 'moderate' | 'high' | 'critical') : acc
    }, 'unknown')

    return {
      total: filtered.length,
      active,
      critical,
      highest: highest === 'critical' ? 'high' : highest,
    }
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mutateAlert = async (id: string, action: RowAction) => {
    setRowLoading((prev) => ({ ...prev, [id]: action }))
    try {
      if (action === 'ack') {
        await ackAlert(id)
      } else {
        await resolveAlert(id)
      }
      await refetch()
      toast({ type: 'success', title: `Alert ${action === 'ack' ? 'acknowledged' : 'resolved'}` })
    } catch {
      toast({
        type: 'error',
        title: 'Alert action failed',
        message: `Could not ${action === 'ack' ? 'acknowledge' : 'resolve'} alert ${id}.`,
      })
    } finally {
      setRowLoading((prev) => ({ ...prev, [id]: undefined }))
    }
  }

  const handleClearAll = async () => {
    setClearLoading(true)
    try {
      const result = await clearAlerts()
      setSelected(null)
      await refetch()
      toast({ type: 'success', title: 'Alerts cleared', message: `Cleared ${result.cleared} alerts.` })
    } catch {
      toast({ type: 'error', title: 'Clear failed', message: 'Unable to clear alerts.' })
    } finally {
      setClearLoading(false)
    }
  }

  const exportCsv = () => {
    downloadCsv('alerts.csv', pagedRows)
    toast({ type: 'success', title: 'Alerts exported', message: `Exported ${pagedRows.length} rows.` })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Alerts</h1>
        <p className="text-gray-400 mt-2 text-sm">Operational alert lifecycle, explainability context, and SLA risk visibility.</p>
      </div>

      {loading && <LoadingState variant="table" />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label="Total Alerts" value={kpis.total} status="info" />
            <KpiCard label="Active" value={kpis.active} status={kpis.active > 0 ? 'warn' : 'healthy'} />
            <KpiCard label="Critical" value={kpis.critical} status={kpis.critical > 0 ? 'critical' : 'healthy'} />
            <KpiCard
              label="Highest SLA Risk"
              value={kpis.highest === 'unknown' ? 'N/A' : kpis.highest.toUpperCase()}
              status={kpis.highest === 'high' ? 'warn' : 'info'}
            />
          </div>

          <TableToolbar
            title="Alerts Stream"
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            leftFilters={(
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as AlertStatusFilter)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'acknowledged', label: 'Acknowledged' },
                    { value: 'resolved', label: 'Resolved' },
                  ]}
                />
                <Select
                  label="Severity"
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value as AlertSeverityFilter)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Severities' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'info', label: 'Info' },
                  ]}
                />
              </div>
            )}
            rightActions={
              hasRole(['admin']) ? (
                <Button variant="danger" size="sm" onClick={handleClearAll} disabled={clearLoading}>
                  {clearLoading ? 'Clearing...' : 'Clear All'}
                </Button>
              ) : undefined
            }
            onExportCsv={exportCsv}
            onRefresh={refetch}
            exportDisabled={pagedRows.length === 0}
          />

          {filtered.length === 0 ? (
            <EmptyState title="No Alerts" message="No alerts match the selected filters." />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">Alerts Stream</h3>
                  <Badge variant="neutral">{filtered.length} alerts</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<AlertItem>
                  columns={[
                    {
                      key: 'severity',
                      header: 'Severity',
                      render: (row) => <Badge variant={badgeForSeverity(row.severity)}>{row.severity}</Badge>,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => <Badge variant={badgeForStatus(row.status)}>{row.status}</Badge>,
                    },
                    { key: 'title', header: 'Title' },
                    {
                      key: 'resource',
                      header: 'Resource',
                      render: (row) => resourceText(row),
                    },
                    {
                      key: 'sla_risk_level',
                      header: 'SLA Risk Level',
                      render: (row) => {
                        const level = normalizeRiskLevel(row)
                        return <Badge variant={riskBadgeVariant(level)}>{level === 'unknown' ? 'N/A' : level}</Badge>
                      },
                    },
                    {
                      key: 'created_at',
                      header: 'Created At',
                      render: (row) => new Date(row.created_at).toLocaleString(),
                    },
                    {
                      key: 'updated_at',
                      header: 'Updated At',
                      render: (row) => (row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'),
                    },
                  ]}
                  rows={pagedRows}
                  onRowClick={(row) => setSelected(row)}
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

          {selected && (
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">Alert Details: {selected.id}</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-200 transition-colors">
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Summary</h4>
                    <p className="text-sm text-gray-300">{(selected as any).message || selected.title}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Explainability</h4>
                    {(() => {
                      const explain = selected.explain ?? selected.explanation
                      if (!explain) {
                        return <p className="text-sm text-gray-500">No explainability payload available.</p>
                      }

                      return (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-300">{explain.summary || 'N/A'}</p>

                          <div>
                            <p className="text-xs uppercase text-gray-500 mb-1">Signals</p>
                            {Array.isArray(explain.signals) && explain.signals.length > 0 ? (
                              <div className="space-y-1">
                                {explain.signals.map((signal: any, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-400">
                                    {signal.name}: {String(signal.value)}
                                    {signal.threshold !== undefined ? ` (threshold ${String(signal.threshold)})` : ''}
                                    {signal.contribution ? ` [${signal.contribution}]` : ''}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">No signals available.</p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs uppercase text-gray-500 mb-1">Logic</p>
                            {Array.isArray(explain.logic) && explain.logic.length > 0 ? (
                              <div className="space-y-1">
                                {explain.logic.map((logicItem: any, idx: number) => (
                                  <p key={idx} className="text-xs text-gray-400">{String(logicItem)}</p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">No logic entries available.</p>
                            )}
                          </div>

                          <p className="text-xs text-gray-400">Confidence reason: {explain.confidence_reason || 'N/A'}</p>
                        </div>
                      )
                    })()}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">SLA Risk</h4>
                    {(() => {
                      const risk = toRiskObject(selected)
                      if (!risk) {
                        return <p className="text-sm text-gray-500">No SLA risk payload available.</p>
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <p className="text-gray-300">risk_score: {risk.risk_score}</p>
                          <p className="text-gray-300">risk_level: {risk.risk_level}</p>
                          <p className="text-gray-300">time_to_impact_minutes: {risk.time_to_impact_minutes ?? 'N/A'}</p>
                          <p className="text-gray-300">confidence: {risk.confidence ?? 'N/A'}</p>
                          <div className="md:col-span-2">
                            <p className="text-xs uppercase text-gray-500 mb-1">Drivers</p>
                            {risk.drivers && risk.drivers.length > 0 ? (
                              <ul className="space-y-1">
                                {risk.drivers.map((driver, idx) => (
                                  <li key={idx} className="text-xs text-gray-400">{driver}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-500">No drivers available.</p>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {hasRole(['admin', 'operator']) && (
                    <div className="flex gap-3 pt-4 border-t border-gray-700">
                      {selected.status === 'active' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => mutateAlert(selected.id, 'ack')}
                          disabled={!!rowLoading[selected.id]}
                        >
                          {rowLoading[selected.id] === 'ack' ? 'Acknowledging...' : 'ACK'}
                        </Button>
                      )}
                      {selected.status !== 'resolved' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => mutateAlert(selected.id, 'resolve')}
                          disabled={!!rowLoading[selected.id]}
                        >
                          {rowLoading[selected.id] === 'resolve' ? 'Resolving...' : 'RESOLVE'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
