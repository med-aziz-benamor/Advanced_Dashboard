import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceDot,
  ReferenceLine,
} from 'recharts'

export interface TimeSeriesDataPoint {
  timestamp: string
  value: number
  lower_bound?: number
  upper_bound?: number
  forecast_value?: number
}

interface LineChartTimeSeriesProps {
  data: TimeSeriesDataPoint[]
  showConfidenceBand?: boolean
  showTwoLines?: boolean
  historyKey?: string
  forecastKey?: string
  peakPoint?: { timestamp: string; value: number }
  height?: number
  xAxisLabel?: string
  yAxisLabel?: string
}

export function LineChartTimeSeries({
  data,
  showConfidenceBand = false,
  showTwoLines = false,
  historyKey = 'value',
  forecastKey = 'forecast_value',
  peakPoint,
  height = 400,
  xAxisLabel,
  yAxisLabel,
}: LineChartTimeSeriesProps) {
  // Custom tooltip for dark theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-charcoal-800 border border-gray-700 rounded-lg px-4 py-3 shadow-lg">
          <p className="text-sm text-gray-300 mb-2 font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              <span className="font-semibold">{entry.value.toFixed(2)}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Format timestamp for X-axis
  const formatXAxis = (tick: string) => {
    try {
      const date = new Date(tick)
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return tick
    }
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#4b4e59" opacity={0.3} />
        
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatXAxis}
          stroke="#9fa2ab"
          style={{ fontSize: '12px' }}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, style: { fill: '#9fa2ab' } } : undefined}
        />
        
        <YAxis
          stroke="#9fa2ab"
          style={{ fontSize: '12px' }}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: '#9fa2ab' } } : undefined}
        />
        
        <Tooltip content={<CustomTooltip />} />
        
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
          formatter={(value) => <span className="text-sm text-gray-300">{value}</span>}
        />

        {/* Confidence band (if enabled and data has bounds) */}
        {showConfidenceBand && data.some(d => d.lower_bound !== undefined) && (
          <>
            <Area
              type="monotone"
              dataKey="upper_bound"
              stroke="none"
              fill="#60a5fa"
              fillOpacity={0.1}
              name="Confidence Upper"
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="lower_bound"
              stroke="none"
              fill="#60a5fa"
              fillOpacity={0.1}
              name="Confidence Lower"
              legendType="none"
            />
          </>
        )}

        {/* Two lines mode (history + forecast) */}
        {showTwoLines ? (
          <>
            <Line
              type="monotone"
              dataKey={historyKey}
              stroke="#9fa2ab"
              strokeWidth={2}
              dot={false}
              name="History"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey={forecastKey}
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Forecast"
              connectNulls
            />
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="value"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            name="Value"
            activeDot={{ r: 6 }}
          />
        )}

        {/* Peak marker */}
        {peakPoint && (
          <>
            <ReferenceDot
              x={peakPoint.timestamp}
              y={peakPoint.value}
              r={6}
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth={2}
            />
            <ReferenceLine
              y={peakPoint.value}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.5}
              label={{
                value: `Peak: ${peakPoint.value.toFixed(1)}`,
                position: 'right',
                fill: '#f59e0b',
                fontSize: 12,
              }}
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
