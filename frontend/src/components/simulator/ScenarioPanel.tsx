import { useState } from 'react'
import { postJSON } from '../../api/client'
import { Card, CardHeader, CardContent, Button, Badge } from '../ui'

interface ScenarioPanelProps {
  onScenarioChange?: () => void
}

export function ScenarioPanel({ onScenarioChange }: ScenarioPanelProps) {
  const [loading, setLoading] = useState(false)
  const [lastApplied, setLastApplied] = useState<{
    scenario: string
    timestamp: string
  } | null>(null)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const scenarios = [
    {
      id: 'cpu_spike',
      label: 'CPU Spike Anomaly',
      description: 'Simulate a critical CPU spike event',
      variant: 'danger' as const,
    },
    {
      id: 'memory_leak',
      label: 'Memory Leak Anomaly',
      description: 'Simulate a progressive memory leak',
      variant: 'warning' as const,
    },
    {
      id: 'load_surge',
      label: 'Load Surge Forecast',
      description: 'Simulate an upcoming load surge',
      variant: 'warning' as const,
    },
    {
      id: 'high_reco',
      label: 'High-Priority Recommendations',
      description: 'Generate critical recommendations',
      variant: 'info' as const,
    },
  ]

  const applyScenario = async (scenarioId: string) => {
    setLoading(true)
    setStatusMessage(null)

    try {
      const result = await postJSON<{ applied_at?: string }>('/api/simulate/apply', {
        scenario: scenarioId,
      })

      setLastApplied({
        scenario: scenarioId,
        timestamp: result.applied_at || new Date().toISOString(),
      })

      setStatusMessage({
        type: 'success',
        text: `Scenario "${scenarioId}" applied successfully`,
      })

      if (onScenarioChange) {
        setTimeout(() => onScenarioChange(), 500)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage({
        type: 'error',
        text: message.includes('403')
          ? 'Access denied. Admin or Operator role required.'
          : `Failed to apply scenario: ${message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const resetScenario = async () => {
    setLoading(true)
    setStatusMessage(null)

    try {
      await postJSON('/api/simulate/reset')

      setLastApplied(null)
      setStatusMessage({
        type: 'success',
        text: 'Reset to normal baseline',
      })

      if (onScenarioChange) {
        setTimeout(() => onScenarioChange(), 500)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error'
      setStatusMessage({
        type: 'error',
        text: message.includes('403')
          ? 'Access denied. Admin or Operator role required.'
          : `Failed to reset: ${message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="subtle">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">
              Demo Scenario Simulator
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Inject realistic scenarios for evaluation and testing
            </p>
          </div>
          <Badge variant="info">Demo Only</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Scenario Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => applyScenario(scenario.id)}
              disabled={loading}
              className={`
                flex flex-col items-start p-4 rounded-lg border-2
                transition-all duration-200
                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
                ${
                  lastApplied?.scenario === scenario.id
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-gray-700 hover:border-gray-600 bg-charcoal-800/30'
                }
              `}
            >
              <Badge variant={scenario.variant} className="mb-2">
                {scenario.label.split(' ')[0]}
              </Badge>
              <span className="text-sm font-medium text-gray-200 text-left">
                {scenario.label}
              </span>
              <span className="text-xs text-gray-400 mt-1 text-left">
                {scenario.description}
              </span>
            </button>
          ))}
        </div>

        {/* Reset Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <Button
            variant="secondary"
            onClick={resetScenario}
            disabled={loading || !lastApplied}
          >
            {loading ? 'Processing...' : 'Reset to Normal'}
          </Button>

          {lastApplied && (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <span className="text-gray-500">Active:</span>
              <Badge variant="neutral">{lastApplied.scenario}</Badge>
              <span className="text-gray-500">at</span>
              <span className="text-gray-300">
                {new Date(lastApplied.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`
              mt-4 p-3 rounded-lg text-sm
              ${
                statusMessage.type === 'success'
                  ? 'bg-green-950/30 border border-green-900/50 text-green-400'
                  : 'bg-red-950/30 border border-red-900/50 text-red-400'
              }
            `}
          >
            {statusMessage.text}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
