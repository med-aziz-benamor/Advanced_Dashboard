import { useState, useMemo } from 'react'
import { Card, CardHeader, CardContent, KpiCard, Badge, Select } from '../components/ui'
import { LoadingState, ErrorState, EmptyState } from '../components/states'
import { usePollingApi } from '../hooks/usePollingApi'
import { fetchForecast } from '../api/endpoints'
import { ChartCard, LineChartTimeSeries, TimeSeriesDataPoint } from '../components/charts'

function Forecast() {
  const [horizon, setHorizon] = useState('60m')

  const { data, loading, error, refetch } = usePollingApi(
    (signal) => fetchForecast(horizon, signal),
    {
      deps: [horizon],
      intervalMs: 20000,
      immediate: true,
    }
  )

  // Calculate KPIs from forecast data
  const kpis = useMemo(() => {
    if (!data) return { historyCount: 0, forecastCount: 0, predictedPeak: 0 }
    
    const historyCount = data.history?.length || 0
    const forecastCount = data.forecast?.length || 0
    const predictedPeak = data.forecast?.length > 0
      ? Math.max(...data.forecast.map((p) => p.value))
      : 0

    return { historyCount, forecastCount, predictedPeak }
  }, [data])

  // Prepare chart data by merging history and forecast
  const chartData = useMemo((): TimeSeriesDataPoint[] => {
    if (!data) return []

    const history = (data.history || []).map(point => ({
      timestamp: point.timestamp,
      value: point.value,
      forecast_value: 0,
    }))

    const forecast = (data.forecast || []).map(point => ({
      timestamp: point.timestamp,
      value: 0,
      forecast_value: point.value,
      lower_bound: point.lower_bound,
      upper_bound: point.upper_bound,
    }))

    return [...history, ...forecast]
  }, [data])

  // Calculate peak point in forecast
  const peakPoint = useMemo(() => {
    if (!data?.forecast || data.forecast.length === 0) return null

    const peak = data.forecast.reduce((max, point) =>
      point.value > max.value ? point : max
    , data.forecast[0])

    return { timestamp: peak.timestamp, value: peak.value }
  }, [data])

  // Calculate risk level based on peak
  const riskLevel = useMemo(() => {
    if (kpis.predictedPeak >= 80) return { level: 'High', variant: 'danger' as const }
    if (kpis.predictedPeak >= 60) return { level: 'Moderate', variant: 'warning' as const }
    return { level: 'Low', variant: 'success' as const }
  }, [kpis.predictedPeak])

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
          Forecast
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Predictive analytics for resource planning and capacity management
        </p>
      </div>

      {/* Horizon Selector */}
      <Card>
        <CardContent>
          <div className="max-w-xs">
            <Select
              label="Forecast Horizon"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              options={[
                { value: '60m', label: 'Next Hour' },
                { value: '1440m', label: 'Next 24 Hours' },
                { value: '10080m', label: 'Next 7 Days' },
                { value: '43200m', label: 'Next 30 Days' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

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
              label="Historical Points"
              value={kpis.historyCount}
              status="info"
            />
            <KpiCard
              label="Forecast Points"
              value={kpis.forecastCount}
              status={kpis.forecastCount > 0 ? 'healthy' : 'warn'}
            />
            <KpiCard
              label="Predicted Peak"
              value={kpis.predictedPeak.toFixed(2)}
              status={kpis.predictedPeak > 80 ? 'critical' : 'info'}
            />
            <KpiCard
              label="Model"
              value={data.model || 'ARIMA'}
              status="info"
            />
          </div>

          {/* Main Forecast Chart */}
          {chartData.length > 0 ? (
            <ChartCard
              title="Resource Utilization Forecast"
              subtitle={`Model: ${data.model || 'ARIMA'} | Horizon: ${data.horizon || horizon}`}
            >
              <LineChartTimeSeries
                data={chartData}
                showConfidenceBand={data.forecast?.some(f => f.lower_bound !== undefined)}
                showTwoLines={true}
                historyKey="value"
                forecastKey="forecast_value"
                peakPoint={peakPoint || undefined}
                height={450}
                yAxisLabel="Utilization (%)"
              />
            </ChartCard>
          ) : (
            <EmptyState
              title="No Chart Data"
              message="No historical or forecast data available for visualization."
            />
          )}

          {/* Forecast Data Preview */}
          {data.forecast && data.forecast.length > 0 ? (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-200">
                  Forecast Data Preview (First 8 Points)
                </h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-sm font-semibold text-gray-300 py-2 px-3">
                          Timestamp
                        </th>
                        <th className="text-right text-sm font-semibold text-gray-300 py-2 px-3">
                          Value
                        </th>
                        <th className="text-right text-sm font-semibold text-gray-300 py-2 px-3">
                          Lower Bound
                        </th>
                        <th className="text-right text-sm font-semibold text-gray-300 py-2 px-3">
                          Upper Bound
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.forecast.slice(0, 8).map((point, idx) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-charcoal-900/50">
                          <td className="text-sm text-gray-400 py-2 px-3">{point.timestamp}</td>
                          <td className="text-sm text-gray-200 py-2 px-3 text-right">
                            {point.value.toFixed(2)}
                          </td>
                          <td className="text-sm text-gray-400 py-2 px-3 text-right">
                            {point.lower_bound?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="text-sm text-gray-400 py-2 px-3 text-right">
                            {point.upper_bound?.toFixed(2) || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.forecast.length > 8 && (
                  <p className="text-xs text-gray-500 mt-3">
                    Showing 8 of {data.forecast.length} forecast points
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No Forecast Data"
              message="No forecast data available. Try adjusting the horizon or check back later."
            />
          )}

          {/* Forecast Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-200">
                  Forecast Summary
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Horizon:</span>
                    <span className="text-sm text-gray-200">{data.horizon || horizon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Model:</span>
                    <span className="text-sm text-gray-200">{data.model || 'ARIMA'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Forecast Points:</span>
                    <span className="text-sm text-gray-200">{kpis.forecastCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Historical Points:</span>
                    <span className="text-sm text-gray-200">{kpis.historyCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-200">
                  Peak Analysis
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {peakPoint ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Peak Time:</span>
                        <span className="text-sm text-gray-200">
                          {new Date(peakPoint.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Peak Value:</span>
                        <span className="text-sm font-semibold text-amber-400">
                          {peakPoint.value.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Risk Level:</span>
                        <Badge variant={riskLevel.variant}>
                          {riskLevel.level}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No peak data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-200">
                  Insights
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    {data.forecast && data.forecast.length > 0 ? (
                      <>
                        Forecast generated using <strong className="text-gray-200">{data.model || 'ARIMA'}</strong> model
                        based on <strong className="text-gray-200">{kpis.historyCount}</strong> historical data points.
                      </>
                    ) : (
                      'No forecast insights available at this time.'
                    )}
                  </p>
                  {kpis.predictedPeak > 80 && (
                    <p className="text-sm text-yellow-400">
                      ⚠️ Predicted peak value exceeds 80%. Consider capacity planning.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default Forecast