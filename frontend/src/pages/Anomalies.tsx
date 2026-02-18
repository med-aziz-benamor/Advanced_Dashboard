import { useMemo, useState } from 'react'
import { Card, CardHeader, CardContent, Badge, DataTable, Select, KpiCard, Button, useToast } from '../components/ui'
import { LoadingState, ErrorState, EmptyState } from '../components/states'
import { usePollingApi } from '../hooks/usePollingApi'
import { fetchAnomalies } from '../api/endpoints'
import type { AnomalyItem } from '../api/types'
import { TableToolbar } from '../components/TableToolbar'
import { downloadCsv } from '../lib/csv'

const PAGE_SIZE = 20

function Anomalies() {
  const { toast } = useToast()
  const [selectedRow, setSelectedRow] = useState<AnomalyItem | null>(null)
  const [timeWindow, setTimeWindow] = useState('60m')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [namespaceFilter, setNamespaceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, error, refetch } = usePollingApi(
    (signal) => fetchAnomalies(timeWindow, signal),
    {
      deps: [timeWindow],
      intervalMs: 15000,
      immediate: true,
    }
  )

  const filteredAnomalies = useMemo(() => {
    if (!data?.anomalies) return []

    const query = search.trim().toLowerCase()
    return data.anomalies.filter((anomaly) => {
      if (severityFilter !== 'all' && anomaly.severity !== severityFilter) return false
      if (namespaceFilter !== 'all' && anomaly.namespace !== namespaceFilter) return false
      if (statusFilter !== 'all' && anomaly.status !== statusFilter) return false

      if (!query) return true

      return [
        anomaly.type,
        anomaly.namespace,
        anomaly.pod || '',
        anomaly.node || '',
        anomaly.severity,
        anomaly.status || '',
        anomaly.reason || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [data?.anomalies, severityFilter, namespaceFilter, statusFilter, search])

  const kpis = useMemo(() => {
    const anomalies = data?.anomalies || []
    return {
      total: anomalies.length,
      critical: anomalies.filter((a) => a.severity === 'critical').length,
      active: anomalies.filter((a) => a.status === 'active').length,
    }
  }, [data?.anomalies])

  const totalPages = Math.max(1, Math.ceil(filteredAnomalies.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = filteredAnomalies.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const exportCsv = () => {
    downloadCsv('anomalies.csv', pagedRows)
    toast({ type: 'success', title: 'Anomalies exported', message: `Exported ${pagedRows.length} rows.` })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Anomalies</h1>
        <p className="text-gray-400 mt-2 text-sm">AI-powered anomaly detection and analysis for your Kubernetes cluster</p>
      </div>

      {loading && <LoadingState variant="kpi" />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label="Total Anomalies" value={kpis.total} status={kpis.total > 5 ? 'warn' : 'info'} />
            <KpiCard label="Critical" value={kpis.critical} status={kpis.critical > 0 ? 'critical' : 'healthy'} />
            <KpiCard label="Active" value={kpis.active} status={kpis.active > 0 ? 'warn' : 'healthy'} />
            <KpiCard label="Time Window" value={data.window || timeWindow} status="info" />
          </div>

          <TableToolbar
            title="Detected Anomalies"
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            onExportCsv={exportCsv}
            onRefresh={refetch}
            exportDisabled={pagedRows.length === 0}
            leftFilters={(
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  label="Severity"
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Severities' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'info', label: 'Info' },
                  ]}
                />
                <Select
                  label="Namespace"
                  value={namespaceFilter}
                  onChange={(e) => {
                    setNamespaceFilter(e.target.value)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Namespaces' },
                    { value: 'production', label: 'Production' },
                    { value: 'staging', label: 'Staging' },
                    { value: 'processing', label: 'Processing' },
                  ]}
                />
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'investigating', label: 'Investigating' },
                    { value: 'resolved', label: 'Resolved' },
                  ]}
                />
                <Select
                  label="Time Window"
                  value={timeWindow}
                  onChange={(e) => {
                    setTimeWindow(e.target.value)
                    setPage(1)
                  }}
                  options={[
                    { value: '60m', label: 'Last Hour' },
                    { value: '1440m', label: 'Last 24 Hours' },
                    { value: '10080m', label: 'Last 7 Days' },
                    { value: '43200m', label: 'Last 30 Days' },
                  ]}
                />
              </div>
            )}
          />

          {filteredAnomalies.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">Detected Anomalies</h3>
                  <Badge variant="neutral">{filteredAnomalies.length} anomalies</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<AnomalyItem>
                  columns={[
                    { key: 'id', header: 'ID' },
                    { key: 'type', header: 'Type' },
                    { key: 'namespace', header: 'Namespace' },
                    {
                      key: 'pod',
                      header: 'Pod',
                      render: (row) => row.pod || row.node || 'N/A',
                    },
                    {
                      key: 'severity',
                      header: 'Severity',
                      render: (row) => (
                        <Badge
                          variant={
                            row.severity === 'critical'
                              ? 'danger'
                              : row.severity === 'warning'
                                ? 'warning'
                                : 'info'
                          }
                        >
                          {row.severity}
                        </Badge>
                      ),
                    },
                    {
                      key: 'detected_at',
                      header: 'Detected At',
                      render: (row) => new Date(row.detected_at).toLocaleString(),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <Badge
                          variant={
                            row.status === 'active' ? 'warning' : row.status === 'resolved' ? 'success' : 'neutral'
                          }
                        >
                          {row.status || 'unknown'}
                        </Badge>
                      ),
                    },
                  ]}
                  rows={pagedRows}
                  onRowClick={(row) => setSelectedRow(row)}
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No Anomalies Found"
              message="No anomalies match the current filters. Try adjusting your filter criteria."
            />
          )}

          {filteredAnomalies.length > 0 && (
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
                  <h3 className="text-lg font-semibold text-gray-200">Anomaly Details: {selectedRow.id}</h3>
                  <button
                    onClick={() => setSelectedRow(null)}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Type:</span>
                        <span className="text-sm text-gray-200">{selectedRow.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Namespace:</span>
                        <span className="text-sm text-gray-200">{selectedRow.namespace}</span>
                      </div>
                      {selectedRow.pod && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Pod:</span>
                          <span className="text-sm text-gray-200">{selectedRow.pod}</span>
                        </div>
                      )}
                      {selectedRow.node && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Node:</span>
                          <span className="text-sm text-gray-200">{selectedRow.node}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Severity:</span>
                        <Badge
                          variant={
                            selectedRow.severity === 'critical'
                              ? 'danger'
                              : selectedRow.severity === 'warning'
                                ? 'warning'
                                : 'info'
                          }
                        >
                          {selectedRow.severity}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Detected At:</span>
                        <span className="text-sm text-gray-200">{selectedRow.detected_at}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Analysis</h4>
                    {selectedRow.baseline !== undefined && selectedRow.current !== undefined && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Baseline:</span>
                          <span className="text-sm text-gray-200">{selectedRow.baseline}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Current:</span>
                          <span className="text-sm text-gray-200">{selectedRow.current}</span>
                        </div>
                      </div>
                    )}
                    {selectedRow.reason && <p className="text-sm text-gray-400 mb-3">{selectedRow.reason}</p>}
                    {selectedRow.evidence?.series && selectedRow.evidence.series.length > 0 ? (
                      <div>
                        {selectedRow.evidence.series[0] && (
                          <p className="text-xs text-gray-500 mb-1">
                            Latest point:{' '}
                            {(() => {
                              const point = selectedRow.evidence?.series?.[selectedRow.evidence.series.length - 1]
                              const time = point?.ts ?? point?.timestamp
                              return time || 'N/A'
                            })()}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mb-2">
                          Evidence: {selectedRow.evidence.series.length} data points
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No evidence data available</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default Anomalies
