


/**
 * Login Page
 * Enterprise-style authentication page
 */
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Card, CardHeader, CardContent, Input } from '../components/ui'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const demoCredentials = [
    { email: 'admin@example.com', role: 'Admin', access: 'Full access' },
    { email: 'ops@example.com', role: 'Operator', access: 'Can trigger scenarios' },
    { email: 'viewer@example.com', role: 'Viewer', access: 'Read-only' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            AdvancedDashboard
          </h1>
          <p className="text-gray-400 text-sm">
            Enterprise Kubernetes AIOps Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-200">Sign In</h2>
            <p className="text-sm text-gray-400 mt-1">
              Enter your credentials to access the dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={isLoading}
              />

              {/* Password Input */}
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-charcoal-700 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-300">Demo Credentials</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {demoCredentials.map((cred, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-charcoal-800 rounded-md border border-charcoal-700"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-200">
                      {cred.email}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-charcoal-700 text-gray-300 rounded">
                      {cred.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Password: <span className="font-mono">admin123</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{cred.access}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
              <p className="text-xs text-blue-300">
                💡 <span className="font-semibold">Tip:</span> All demo accounts use the password <span className="font-mono bg-blue-500/20 px-1 rounded">admin123</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>AdvancedDashboard v1.0.0 | Enterprise Edition</p>
        </div>
      </div>
    </div>
  )
}

export default Login
