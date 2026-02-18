import { useMemo, useState } from 'react'
import { Card, CardHeader, CardContent, Badge, DataTable, Select, KpiCard, Button, useToast } from '../components/ui'
import { LoadingState, ErrorState, EmptyState } from '../components/states'
import { usePollingApi } from '../hooks/usePollingApi'
import {
  applyRecommendation,
  dismissRecommendation,
  fetchRecommendations,
  snoozeRecommendation,
} from '../api/endpoints'
import type { RecommendationItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { TableToolbar } from '../components/TableToolbar'
import { downloadCsv } from '../lib/csv'

type RecommendationAction = 'apply' | 'dismiss' | 'snooze'

const PAGE_SIZE = 20

function targetText(row: RecommendationItem) {
  const parts = []
  if (row.namespace) parts.push(`ns:${row.namespace}`)
  if (row.pod) parts.push(`pod:${row.pod}`)
  if (row.deployment) parts.push(`deploy:${row.deployment}`)
  return parts.length > 0 ? parts.join(', ') : row.target || 'N/A'
}

function Recommendations() {
  const { hasRole } = useAuth()
  const { toast } = useToast()
  const [selectedRow, setSelectedRow] = useState<RecommendationItem | null>(null)
  const [namespace, setNamespace] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rowLoadingAction, setRowLoadingAction] = useState<Record<string, RecommendationAction | undefined>>({})

  const { data, loading, error, refetch } = usePollingApi(
    (signal) => fetchRecommendations(namespace !== 'all' ? namespace : 'all', signal),
    {
      deps: [namespace],
      intervalMs: 20000,
      immediate: true,
    }
  )

  const canMutate = hasRole(['admin', 'operator'])

  const filteredRecommendations = useMemo(() => {
    if (!data?.recommendations) return []

    const query = search.trim().toLowerCase()
    return data.recommendations.filter((rec) => {
      if (typeFilter !== 'all' && rec.type !== typeFilter) return false
      if (priorityFilter !== 'all' && rec.priority !== priorityFilter) return false

      if (!query) return true

      return [
        rec.type,
        rec.target,
        rec.namespace || '',
        rec.pod || '',
        rec.deployment || '',
        rec.priority,
        rec.reason || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [data?.recommendations, typeFilter, priorityFilter, search])

  const kpis = useMemo(() => {
    const recommendations = data?.recommendations || []
    const criticalCount = recommendations.filter((r) => r.priority === 'critical').length
    const totalConfidence = recommendations.reduce((sum, r) => {
      const conf = parseFloat(r.confidence?.replace('%', '') || '0')
      return sum + conf
    }, 0)
    const avgConfidence = recommendations.length > 0 ? (totalConfidence / recommendations.length).toFixed(0) : '0'

    return {
      total: recommendations.length,
      critical: criticalCount,
      avgConfidence: `${avgConfidence}%`,
    }
  }, [data?.recommendations])

  const totalPages = Math.max(1, Math.ceil(filteredRecommendations.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = filteredRecommendations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const runAction = async (id: string, action: RecommendationAction) => {
    setRowLoadingAction((prev) => ({ ...prev, [id]: action }))
    try {
      if (action === 'apply') {
        await applyRecommendation(id)
      } else if (action === 'dismiss') {
        await dismissRecommendation(id)
      } else {
        await snoozeRecommendation(id)
      }
      await refetch()
      toast({ type: 'success', title: `Recommendation ${action}d`, message: `Action applied to ${id}.` })
      if (selectedRow?.id === id && action !== 'apply') {
        setSelectedRow(null)
      }
    } catch {
      toast({ type: 'error', title: 'Recommendation action failed', message: `Could not ${action} ${id}.` })
    } finally {
      setRowLoadingAction((prev) => ({ ...prev, [id]: undefined }))
    }
  }

  const exportCsv = () => {
    downloadCsv('recommendations.csv', pagedRows)
    toast({ type: 'success', title: 'Recommendations exported', message: `Exported ${pagedRows.length} rows.` })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Recommendations</h1>
        <p className="text-gray-400 mt-2 text-sm">AI-powered optimization suggestions for your infrastructure</p>
      </div>

      {loading && <LoadingState variant="kpi" />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label="Total Recommendations" value={kpis.total} status="info" />
            <KpiCard label="Critical Priority" value={kpis.critical} status={kpis.critical > 0 ? 'critical' : 'healthy'} />
            <KpiCard label="Avg. Confidence" value={kpis.avgConfidence} status="healthy" />
            <KpiCard
              label="Generated At"
              value={data.generated_at ? new Date(data.generated_at).toLocaleTimeString() : 'N/A'}
              status="info"
            />
          </div>

          <TableToolbar
            title="Active Recommendations"
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            onExportCsv={exportCsv}
            onRefresh={refetch}
            exportDisabled={pagedRows.length === 0}
            leftFilters={(
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Type"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'resource_optimization', label: 'Resource Optimization' },
                    { value: 'scaling_recommendation', label: 'Scaling Recommendation' },
                    { value: 'health_check', label: 'Health Check' },
                    { value: 'memory_optimization', label: 'Memory Optimization' },
                    { value: 'storage_optimization', label: 'Storage Optimization' },
                  ]}
                />
                <Select
                  label="Priority"
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Priorities' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ]}
                />
                <Select
                  label="Namespace"
                  value={namespace}
                  onChange={(e) => {
                    setNamespace(e.target.value)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Namespaces' },
                    { value: 'production', label: 'Production' },
                    { value: 'staging', label: 'Staging' },
                    { value: 'logging', label: 'Logging' },
                    { value: 'processing', label: 'Processing' },
                  ]}
                />
              </div>
            )}
          />

          {filteredRecommendations.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">Active Recommendations</h3>
                  <Badge variant="neutral">{filteredRecommendations.length} recommendations</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<RecommendationItem>
                  columns={[
                    { key: 'id', header: 'ID' },
                    { key: 'type', header: 'Type' },
                    {
                      key: 'target',
                      header: 'Target',
                      render: (row) => targetText(row),
                    },
                    {
                      key: 'priority',
                      header: 'Priority',
                      render: (row) => (
                        <Badge
                          variant={
                            row.priority === 'critical'
                              ? 'danger'
                              : row.priority === 'high'
                                ? 'warning'
                                : row.priority === 'medium'
                                  ? 'info'
                                  : 'neutral'
                          }
                        >
                          {row.priority || 'N/A'}
                        </Badge>
                      ),
                    },
                    { key: 'suggested_change', header: 'Suggested Change' },
                    { key: 'confidence', header: 'Confidence' },
                  ]}
                  rows={pagedRows}
                  onRowClick={(row) => setSelectedRow(row)}
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No Recommendations Found"
              message="No recommendations match the current filters. Try adjusting your filter criteria."
            />
          )}

          {filteredRecommendations.length > 0 && (
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

          {selectedRow && (
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">Recommendation Details: {selectedRow.id}</h3>
                  <button
                    onClick={() => setSelectedRow(null)}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Type:</span>
                          <span className="text-sm text-gray-200">{selectedRow.type}</span>
                        </div>
                        {selectedRow.namespace && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Namespace:</span>
                            <span className="text-sm text-gray-200">{selectedRow.namespace}</span>
                          </div>
                        )}
                        {selectedRow.pod && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Pod:</span>
                            <span className="text-sm text-gray-200">{selectedRow.pod}</span>
                          </div>
                        )}
                        {selectedRow.deployment && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Deployment:</span>
                            <span className="text-sm text-gray-200">{selectedRow.deployment}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Priority:</span>
                          <Badge
                            variant={
                              selectedRow.priority === 'critical'
                                ? 'danger'
                                : selectedRow.priority === 'high'
                                  ? 'warning'
                                  : selectedRow.priority === 'medium'
                                    ? 'info'
                                    : 'neutral'
                            }
                          >
                            {selectedRow.priority || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Confidence:</span>
                          <span className="text-sm text-gray-200">{selectedRow.confidence || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Details</h4>
                      <div className="space-y-3">
                        {selectedRow.reason && (
                          <div>
                            <span className="text-xs text-gray-500">Reason:</span>
                            <p className="text-sm text-gray-400 mt-1">{selectedRow.reason}</p>
                          </div>
                        )}
                        {selectedRow.suggested_change && (
                          <div>
                            <span className="text-xs text-gray-500">Suggested Change:</span>
                            <p className="text-sm text-gray-400 mt-1">{selectedRow.suggested_change}</p>
                          </div>
                        )}
                        {!selectedRow.reason && !selectedRow.suggested_change && (
                          <p className="text-sm text-gray-500">No additional details available</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {canMutate && (
                    <div className="flex gap-3 pt-4 border-t border-gray-700">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => runAction(selectedRow.id, 'apply')}
                        disabled={!!rowLoadingAction[selectedRow.id]}
                      >
                        {rowLoadingAction[selectedRow.id] === 'apply' ? 'Applying...' : 'Apply Recommendation'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => runAction(selectedRow.id, 'dismiss')}
                        disabled={!!rowLoadingAction[selectedRow.id]}
                      >
                        {rowLoadingAction[selectedRow.id] === 'dismiss' ? 'Dismissing...' : 'Dismiss'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => runAction(selectedRow.id, 'snooze')}
                        disabled={!!rowLoadingAction[selectedRow.id]}
                      >
                        {rowLoadingAction[selectedRow.id] === 'snooze' ? 'Snoozing...' : 'Snooze for 7 days'}
                      </Button>
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

export default Recommendations
