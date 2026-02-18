import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import AppLayout from '../components/layout/AppLayout'
import Login from '../features/auth/Login'
import Overview from '../features/overview/Overview'
import Anomalies from '../features/anomalies/Anomalies'
import Alerts from '../features/alerts/Alerts'
import Forecast from '../features/forecast/Forecast'
import Recommendations from '../features/recommendations/Recommendations'
import Settings from '../features/settings/Settings'
import Audit from '../features/audit/Audit'

export function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/overview" replace />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/overview" element={<Overview />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/audit"
            element={
              <ProtectedRoute roles={['admin', 'operator']}>
                <Audit />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </Router>
  )
}
