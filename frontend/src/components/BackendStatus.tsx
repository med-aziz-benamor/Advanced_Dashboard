import { useState, useEffect } from 'react'
import { fetchHealth as fetchHealthStatus } from '../api/endpoints'
import type { HealthResponse } from '../api/types'

type LoadingState = 'idle' | 'loading' | 'success' | 'error'

function BackendStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setLoadingState('loading')
    setError(null)

    try {
      const data = await fetchHealthStatus()
      setHealth(data)
      setLoadingState('success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setLoadingState('error')
    }
  }

  useEffect(() => {
    checkHealth()
    // Refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    if (loadingState === 'loading') return 'bg-yellow-500'
    if (loadingState === 'error') return 'bg-red-500'
    if (health?.status === 'healthy') return 'bg-green-500'
    return 'bg-gray-500'
  }

  const getStatusText = () => {
    if (loadingState === 'loading') return 'Checking...'
    if (loadingState === 'error') return 'Offline'
    if (health?.status === 'healthy') return 'Healthy'
    return 'Unknown'
  }

  return (
    <div className="bg-charcoal-800/50 border border-charcoal-700 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Backend Status</h3>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${getStatusColor()} ${loadingState === 'success' ? 'animate-pulse' : ''}`}></div>
          <span className="text-sm text-gray-400">{getStatusText()}</span>
        </div>
      </div>

      {loadingState === 'loading' && (
        <div className="space-y-3">
          <div className="h-4 bg-charcoal-700 rounded animate-pulse"></div>
          <div className="h-4 bg-charcoal-700 rounded animate-pulse w-3/4"></div>
        </div>
      )}

      {loadingState === 'error' && (
        <div className="bg-red-950/30 border border-red-900/50 rounded p-3">
          <p className="text-sm text-red-400 font-medium mb-1">Connection Failed</p>
          <p className="text-xs text-red-300/70">{error}</p>
          <button
            onClick={checkHealth}
            className="mt-3 text-xs px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-300 rounded transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {loadingState === 'success' && health && (
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-charcoal-700">
            <span className="text-sm text-gray-400">Status</span>
            <span className="text-sm font-medium text-green-400 uppercase">
              {health.status}
            </span>
          </div>

          {health.provider && (
            <div className="flex justify-between items-center py-2 border-b border-charcoal-700">
              <span className="text-sm text-gray-400">Provider</span>
              <span className="text-sm font-medium text-gray-200">
                {health.provider}
              </span>
            </div>
          )}

          {health.cluster && (
            <div className="flex justify-between items-center py-2 border-b border-charcoal-700">
              <span className="text-sm text-gray-400">Cluster</span>
              <span className="text-sm font-medium text-gray-200">
                {health.cluster}
              </span>
            </div>
          )}

          {health.version && (
            <div className="flex justify-between items-center py-2 border-b border-charcoal-700">
              <span className="text-sm text-gray-400">Version</span>
              <span className="text-sm font-mono text-gray-200">
                {health.version}
              </span>
            </div>
          )}

          {health.timestamp && (
            <div className="pt-2">
              <p className="text-xs text-gray-500">
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          <button
            onClick={checkHealth}
            className="w-full mt-2 text-xs px-3 py-2 bg-charcoal-700/50 hover:bg-charcoal-700 border border-charcoal-600 text-gray-300 rounded transition-colors"
          >
            Refresh Status
          </button>
        </div>
      )}
    </div>
  )
}

export default BackendStatus
