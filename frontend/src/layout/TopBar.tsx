import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { emitRefresh } from '../lib/refreshBus'

function TopBar() {
  const [timeRange, setTimeRange] = useState('1h')
  const [showIntegrations, setShowIntegrations] = useState(false)
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const handleRefresh = () => {
    emitRefresh()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const prometheusUrl = import.meta.env.VITE_PROMETHEUS_URL || 'http://192.168.1.211:30090'
  const grafanaUrl = import.meta.env.VITE_GRAFANA_URL || 'http://192.168.1.211:30382'

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const roleColor: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    operator: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    viewer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  const initials = user
    ? user.email
        .split('@')[0]
        .slice(0, 2)
        .toUpperCase()
    : 'AD'

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-charcoal-900 border-b border-gray-700 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-100 tracking-tight">
            AdvancedDashboard
          </h1>
        </div>

        {/* Center: Cluster Label */}
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1.5 bg-charcoal-800 border border-gray-700 rounded-md">
            <span className="text-xs text-gray-400 font-medium">Cluster:</span>
            <span className="ml-2 text-sm text-gray-200 font-semibold">k8s-openstack</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1.5 bg-charcoal-800 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="30m">Last 30m</option>
            <option value="1h">Last 1h</option>
            <option value="6h">Last 6h</option>
            <option value="24h">Last 24h</option>
          </select>

          {/* Integrations Dropdown - Admin/Operator only */}
          {hasRole(['admin', 'operator']) && (
            <div className="relative">
              <button
                onClick={() => setShowIntegrations(!showIntegrations)}
                onBlur={() => setTimeout(() => setShowIntegrations(false), 200)}
                className="p-2 hover:bg-charcoal-800 rounded-md transition-colors"
                title="External Integrations"
              >
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </button>
              {showIntegrations && (
                <div className="absolute right-0 mt-2 w-56 bg-charcoal-800 border border-gray-700 rounded-md shadow-lg py-1 z-50">
                  <button
                    onClick={() => openExternal(prometheusUrl)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-charcoal-700 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                    </svg>
                    <span>Open Prometheus</span>
                  </button>
                  <button
                    onClick={() => openExternal(grafanaUrl)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-charcoal-700 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 3h18v18H3V3m2 2v14h14V5H5m2 2h10v2H7V7m0 4h10v2H7v-2m0 4h7v2H7v-2z" />
                    </svg>
                    <span>Open Grafana</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-charcoal-800 rounded-md transition-colors"
            title="Refresh"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-3">
              {/* Role Badge */}
              <span
                className={`text-xs px-2 py-1 rounded border font-medium ${
                  roleColor[user.role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                }`}
              >
                {user.role}
              </span>

              {/* Email */}
              <span className="text-sm text-gray-400 hidden lg:inline">
                {user.email}
              </span>

              {/* Avatar */}
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">{initials}</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-charcoal-800 rounded-md transition-colors"
                title="Logout"
              >
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TopBar
