/**
 * API Response Type Definitions
 */

// Health Check
export interface HealthResponse {
  status: string
  provider?: string
  cluster?: string
  version?: string
  timestamp?: string
}

// Overview
export interface OverviewResponse {
  health_score?: number
  active_anomalies?: number
  recommendations?: number
  load_forecast_preview?: number | number[]
  top_anomalies?: TopAnomaly[]
  nodes?: NodeInfo[]
  cluster_metrics?: {
    cpu_usage?: number
    memory_usage?: number
    storage_usage?: number
    network_io?: string | number
  }
  sla_risk?: {
    risk_score: number
    risk_level: 'high' | 'moderate' | 'low' | 'critical'
    time_to_impact_minutes?: number
    drivers?: string[]
    confidence?: number
  }
  alerts_summary?: {
    active: number
    critical: number
    updated_at: string
  }
  ai_meta?: {
    mode?: string
    analysis_time_ms?: number
    agent_version?: string
  }
}

export interface TopAnomaly {
  id: string
  type: string
  severity: string
  detected_at: string
  namespace?: string
  pod?: string
}

export interface NodeInfo {
  name: string
  status: string
  cpu: string
  memory: string
  pods: number
}

// Anomalies
export interface AnomaliesResponse {
  anomalies: AnomalyItem[]
  window: string
  count: number
  next_cursor?: string
}

export interface AnomalyItem {
  id: string
  type: string
  namespace: string
  pod?: string
  node?: string
  severity: string
  detected_at: string
  status?: string
  baseline?: number
  current?: number
  evidence?: {
    series?: Array<{
      ts?: string
      timestamp?: string
      value: number
    }>
  }
  reason?: string
  explanation?: {
    summary?: string
    signals?: Array<{
      name: string
      value: number | string
      threshold?: number | string
      contribution?: string
    }>
    logic?: string[]
    confidence_reason?: string
  }
  confidence?: number
}

// Forecast
export interface ForecastResponse {
  history: ForecastPoint[]
  forecast: ForecastPoint[]
  horizon: string
  confidence_lower?: ForecastPoint[]
  confidence_upper?: ForecastPoint[]
  model?: string
  predicted_peak?: number
  peak_time?: string
  trend?: string
  risk_level?: string
  confidence?: number
  sla_risk?: {
    risk_score: number
    risk_level: 'high' | 'moderate' | 'low' | 'critical'
    time_to_impact_minutes?: number
    drivers?: string[]
    confidence?: number
  }
  alerts_summary?: {
    active: number
    critical: number
    updated_at: string
  }
  ai_meta?: {
    mode?: string
    analysis_time_ms?: number
    agent_version?: string
  }
}

export interface ForecastPoint {
  timestamp: string
  value: number
  lower_bound?: number
  upper_bound?: number
}

// Recommendations
export interface RecommendationsResponse {
  recommendations: RecommendationItem[]
  namespace?: string
  count?: number
  generated_at?: string
  next_cursor?: string
  sla_risk?: {
    risk_score: number
    risk_level: 'high' | 'moderate' | 'low' | 'critical'
    time_to_impact_minutes?: number
    drivers?: string[]
    confidence?: number
  }
  alerts_summary?: {
    active: number
    critical: number
    updated_at: string
  }
  ai_meta?: {
    mode?: string
    analysis_time_ms?: number
    agent_version?: string
  }
}

export interface RecommendationItem {
  id: string
  type: string
  target: string
  namespace?: string
  pod?: string
  deployment?: string
  priority: string
  suggested_change?: string
  reason?: string
  confidence?: string
  impact?: string
  current?: Record<string, any>
  suggested?: Record<string, any>
  explanation?: {
    summary?: string
    signals?: Array<{
      name: string
      value: number | string
      threshold?: number | string
      contribution?: string
    }>
    logic?: string[]
    confidence_reason?: string
  }
}

export interface AlertItem {
  id: string
  title: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  status: 'active' | 'acknowledged' | 'resolved'
  created_at: string
  updated_at?: string
  fingerprint?: string
  resource?: {
    namespace?: string
    pod?: string
    node?: string
    deployment?: string
  }
  entity?: {
    namespace?: string
    pod?: string
    node?: string
    deployment?: string
    cluster?: string
    target?: string
  }
  explain?: {
    summary?: string
    signals?: any
    logic?: any
    confidence_reason?: string
  }
  explanation?: {
    summary?: string
    signals?: any
    logic?: any
    confidence_reason?: string
  }
  sla_risk?: {
    risk_score: number
    risk_level: 'high' | 'moderate' | 'low'
    time_to_impact_minutes?: number
    drivers?: string[]
    confidence?: string | number
  }
  meta?: Record<string, any>
}

export interface AlertsListResponse {
  alerts: AlertItem[]
  count: number
  total?: number
  generated_at?: string
  next_cursor?: string
}

export interface ClearAlertsResponse {
  status: string
  cleared: number
}

export interface ModeStatusResponse {
  configured_mode: string
  active_mode: 'demo' | 'prometheus' | 'auto' | string
  prometheus_url: string
  prometheus_up: boolean
  current_scenario: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  email: string
  role: string
}

export interface AuditEvent {
  id: string
  ts: string
  actor_email: string
  actor_role: string
  action: string
  target_id?: string | null
  metadata?: Record<string, any>
}

export interface AuditListResponse {
  events: AuditEvent[]
  next_cursor?: string | null
}
