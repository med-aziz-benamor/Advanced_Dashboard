import BackendStatus from '../components/BackendStatus'
import { Card, CardHeader, CardContent, KpiCard, DataTable, Badge } from '../components/ui'
import { LoadingState, ErrorState, EmptyState } from '../components/states'
import { ScenarioPanel } from '../components/simulator'
import { usePollingApi } from '../hooks/usePollingApi'
import { fetchOverview } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'

function Overview() {
  const { data, loading, error, refetch } = usePollingApi(
    fetchOverview,
    {
      deps: [],
      intervalMs: 10000,
      immediate: true,
    }
  )

  const { hasRole } = useAuth()
  const preview = Array.isArray(data?.load_forecast_preview)
    ? data.load_forecast_preview
    : data?.load_forecast_preview !== undefined
      ? [data.load_forecast_preview]
      : []

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
          Overview
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Real-time cluster health and system status dashboard
        </p>
      </div>

      {/* Demo Scenario Simulator - only for admin/operator */}
      {hasRole(['admin', 'operator']) && (
        <ScenarioPanel onScenarioChange={refetch} />
      )}

      {/* Loading State */}
      {loading && <LoadingState variant="kpi" />}

      {/* Error State */}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {/* Data Loaded */}
      {!loading && !error && data && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              label="Health Score"
              value={data.health_score ? `${data.health_score}%` : 'N/A'}
              status={
                data.health_score && data.health_score >= 90
                  ? 'healthy'
                  : data.health_score && data.health_score >= 70
                  ? 'warn'
                  : 'critical'
              }
            />
            <KpiCard
              label="Active Anomalies"
              value={data.active_anomalies ?? 0}
              status={
                data.active_anomalies === 0
                  ? 'healthy'
                  : data.active_anomalies && data.active_anomalies < 5
                  ? 'warn'
                  : 'critical'
              }
            />
            <KpiCard
              label="Forecast Preview"
              value={
                preview.length > 0
                  ? `${Math.round(preview[preview.length - 1])}%`
                  : 'N/A'
              }
              status="info"
            />
            <KpiCard
              label="Recommendations"
              value={data.recommendations ?? 0}
              status="info"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Backend Status Card */}
            <Card>
              <CardContent>
                <BackendStatus />
              </CardContent>
            </Card>

            {/* Cluster Metrics */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-200">
                  Cluster Metrics
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">CPU Usage</span>
                    <span className="text-sm font-medium text-gray-200">
                      {data.cluster_metrics?.cpu_usage
                        ? `${data.cluster_metrics.cpu_usage}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Memory Usage</span>
                    <span className="text-sm font-medium text-gray-200">
                      {data.cluster_metrics?.memory_usage
                        ? `${data.cluster_metrics.memory_usage}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Storage Usage</span>
                    <span className="text-sm font-medium text-gray-200">
                      {data.cluster_metrics?.storage_usage
                        ? `${data.cluster_metrics.storage_usage}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Network I/O</span>
                    <span className="text-sm font-medium text-gray-200">
                      {data.cluster_metrics?.network_io || 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource Usage */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-200">
                  Resource Usage
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-400">CPU</span>
                      <span className="text-xs text-gray-300">
                        {data.cluster_metrics?.cpu_usage
                          ? `${data.cluster_metrics.cpu_usage}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="h-2 bg-charcoal-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${data.cluster_metrics?.cpu_usage || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-400">Memory</span>
                      <span className="text-xs text-gray-300">
                        {data.cluster_metrics?.memory_usage
                          ? `${data.cluster_metrics.memory_usage}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="h-2 bg-charcoal-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${data.cluster_metrics?.memory_usage || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-400">Storage</span>
                      <span className="text-xs text-gray-300">
                        {data.cluster_metrics?.storage_usage
                          ? `${data.cluster_metrics.storage_usage}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="h-2 bg-charcoal-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: `${data.cluster_metrics?.storage_usage || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Anomalies */}
          {data.top_anomalies && data.top_anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">
                    Recent Anomalies
                  </h3>
                  <Badge variant="neutral">{data.top_anomalies.length} anomalies</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    { key: 'id', header: 'ID' },
                    { key: 'type', header: 'Type' },
                    { key: 'namespace', header: 'Namespace' },
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
                    { key: 'detected_at', header: 'Detected At' },
                  ]}
                  rows={data.top_anomalies}
                />
              </CardContent>
            </Card>
          )}

          {/* Nodes Table */}
          {data.nodes && data.nodes.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">
                    Cluster Nodes
                  </h3>
                  <Badge variant="neutral">{data.nodes.length} nodes</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    { key: 'name', header: 'Node Name' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <Badge variant={row.status === 'Ready' ? 'success' : 'danger'}>
                          {row.status}
                        </Badge>
                      ),
                    },
                    { key: 'cpu', header: 'CPU' },
                    { key: 'memory', header: 'Memory' },
                    { key: 'pods', header: 'Pods' },
                  ]}
                  rows={data.nodes}
                  onRowClick={(row) => console.log('Node clicked:', row.name)}
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="Nodes Data Not Available"
              message="Node information will be available once the backend provides cluster node data."
            />
          )}
        </>
      )}
    </div>
  )
}

export default Overview
