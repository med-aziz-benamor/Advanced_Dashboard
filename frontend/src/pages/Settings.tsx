import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, Input, Select, Button, Badge, useToast } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { usePollingApi } from '../hooks/usePollingApi'
import { fetchMode, setMode } from '../api/endpoints'

// Prometheus Status Check Component
function PrometheusStatus() {
  const [isReachable, setIsReachable] = useState<boolean | null>(null)

  useEffect(() => {
    const checkPrometheus = async () => {
      try {
        const response = await fetch('/api/mode')
        const data = await response.json()
        setIsReachable(data.prometheus_up || false)
      } catch {
        setIsReachable(false)
      }
    }
    checkPrometheus()
    const interval = setInterval(checkPrometheus, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [])

  if (isReachable === null) {
    return <Badge variant="neutral">Checking...</Badge>
  }
  return isReachable ? (
    <Badge variant="success">Connected</Badge>
  ) : (
    <Badge variant="danger">Unreachable</Badge>
  )
}

function Settings() {
  const { user, hasRole } = useAuth()
  const { toast } = useToast()
  const { data: modeData, refetch: refetchMode } = usePollingApi(fetchMode, {
    intervalMs: 20000,
    immediate: true,
    pauseWhenHidden: true,
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
          Settings
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Configure your dashboard preferences and system settings
        </p>
      </div>

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-200">
            User Preferences
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Display Name"
                placeholder="Enter your name"
                defaultValue={user?.email.split('@')[0] || 'User'}
                disabled={hasRole(['viewer'])}
              />
              <Input
                label="Email"
                type="email"
                placeholder="admin@example.com"
                defaultValue={user?.email || ''}
                disabled
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Theme"
                options={[
                  { value: 'dark', label: 'Dark (Current)' },
                  { value: 'light', label: 'Light' },
                  { value: 'auto', label: 'Auto' },
                ]}
              />
              <Select
                label="Language"
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'fr', label: 'Français' },
                  { value: 'es', label: 'Español' },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Time Zone"
                options={[
                  { value: 'utc', label: 'UTC' },
                  { value: 'est', label: 'EST (UTC-5)' },
                  { value: 'pst', label: 'PST (UTC-8)' },
                ]}
              />
              <Select
                label="Date Format"
                options={[
                  { value: 'iso', label: 'YYYY-MM-DD' },
                  { value: 'us', label: 'MM/DD/YYYY' },
                  { value: 'eu', label: 'DD/MM/YYYY' },
                ]}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="primary" size="sm">Save Changes</Button>
              <Button variant="secondary" size="sm">Cancel</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode Control - Admin Only */}
      {hasRole(['admin']) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">
                Data Mode Control
              </h3>
              <Badge variant="danger">Admin Only</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-4">
              Switch the backend data source between demo data and live Prometheus metrics.
            </p>
            <div className="mb-4">
              <Badge variant="info">Current: {modeData?.active_mode || 'unknown'}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModeButton mode="demo" label="Demo Mode" description="Use simulated data for testing" onSuccess={refetchMode} onNotify={toast} />
              <ModeButton mode="prometheus" label="Prometheus" description="Use live cluster metrics" onSuccess={refetchMode} onNotify={toast} />
              <ModeButton mode="auto" label="Auto Detect" description="Prometheus with demo fallback" onSuccess={refetchMode} onNotify={toast} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-200">
            Notification Settings
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-200">Email Notifications</p>
                <p className="text-xs text-gray-400">Receive alerts via email</p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-200">Slack Integration</p>
                <p className="text-xs text-gray-400">Send alerts to Slack channels</p>
              </div>
              <Badge variant="neutral">Disabled</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-200">Critical Anomalies</p>
                <p className="text-xs text-gray-400">Notify for critical severity alerts</p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-200">Daily Summary</p>
                <p className="text-xs text-gray-400">Receive daily cluster health report</p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            {hasRole(['admin', 'operator']) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <Input
                    label="Slack Webhook URL"
                    placeholder="https://hooks.slack.com/..."
                  />
                  <Input
                    label="PagerDuty API Key"
                    placeholder="Enter API key"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="primary" size="sm">Update Notifications</Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Integrations - Admin/Operator only */}
      {hasRole(['admin', 'operator']) && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-200">
              External Integrations
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Prometheus */}
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">Prometheus</p>
                  <p className="text-xs text-gray-400">Metrics collection endpoint</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    {import.meta.env.VITE_PROMETHEUS_URL || 'http://192.168.1.211:30090'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <PrometheusStatus />
                  <button
                    onClick={() =>
                      window.open(
                        import.meta.env.VITE_PROMETHEUS_URL || 'http://192.168.1.211:30090',
                        '_blank'
                      )
                    }
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                  >
                    Open
                  </button>
                </div>
              </div>

              {/* Grafana */}
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">Grafana</p>
                  <p className="text-xs text-gray-400">Visualization and dashboards</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    {import.meta.env.VITE_GRAFANA_URL || 'http://192.168.1.211:30382'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="info">Available</Badge>
                  <button
                    onClick={() =>
                      window.open(
                        import.meta.env.VITE_GRAFANA_URL || 'http://192.168.1.211:30382',
                        '_blank'
                      )
                    }
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                  >
                    Open
                  </button>
                </div>
              </div>

              {/* Mode Info */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-200">Backend Data Source</p>
                  <p className="text-xs text-gray-400">
                    Current mode: <span className="font-semibold">{modeData?.active_mode || 'unknown'}</span>
                  </p>
                </div>
                {modeData?.prometheus_up ? (
                  <Badge variant="success">Prometheus Connected</Badge>
                ) : (
                  <Badge variant="warning">Demo Mode</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Control - Admin only */}
      {hasRole(['admin']) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">
                Access Control
              </h3>
              <Button variant="primary" size="sm">Add User</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-200">admin@example.com</p>
                  <p className="text-xs text-gray-400">Administrator</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="info">Admin</Badge>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-200">ops@example.com</p>
                  <p className="text-xs text-gray-400">Operations Team</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success">Operator</Badge>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-200">viewer@example.com</p>
                  <p className="text-xs text-gray-400">Read-only Access</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="neutral">Viewer</Badge>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ModeButton({
  mode,
  label,
  description,
  onSuccess,
  onNotify,
}: {
  mode: 'demo' | 'prometheus' | 'auto'
  label: string
  description: string
  onSuccess?: () => void
  onNotify?: (input: { type?: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string; durationMs?: number }) => void
}) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const switchMode = async () => {
    setLoading(true)
    setStatus('idle')
    try {
      await setMode(mode)
      setStatus('success')
      onNotify?.({ type: 'success', title: `Mode changed to ${mode}`, message: 'Backend data mode updated.' })
      onSuccess?.()
    } catch {
      setStatus('error')
      onNotify?.({ type: 'error', title: `Failed to set ${mode}`, message: 'Please verify backend availability and permissions.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={switchMode}
      disabled={loading}
      className={`p-4 rounded-lg border-2 text-left transition-all ${
        status === 'success'
          ? 'border-green-500 bg-green-950/20'
          : status === 'error'
          ? 'border-red-500 bg-red-950/20'
          : 'border-gray-700 hover:border-gray-600 bg-charcoal-800/30'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
    >
      <p className="text-sm font-medium text-gray-200">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{description}</p>
    </button>
  )
}

export default Settings
