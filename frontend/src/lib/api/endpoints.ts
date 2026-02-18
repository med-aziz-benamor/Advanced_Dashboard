/**
 * API Endpoints - Typed functions for backend calls
 */

import { getJSON, postJSON } from './client'
import type {
  HealthResponse,
  OverviewResponse,
  AnomaliesResponse,
  ForecastResponse,
  RecommendationsResponse,
  AlertsListResponse,
  AlertItem,
  ClearAlertsResponse,
  ModeStatusResponse,
  AuditListResponse,
} from './types'

/**
 * Fetch backend health status
 */
export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return getJSON<HealthResponse>('/api/health', signal)
}

/**
 * Fetch overview dashboard data
 */
export function fetchOverview(signal?: AbortSignal): Promise<OverviewResponse> {
  return getJSON<OverviewResponse>('/api/overview', signal)
}

/**
 * Fetch anomalies with optional time window
 * @param window - Time window (e.g., '60m', '24h')
 */
export function fetchAnomalies(
  window: string = '60m',
  signal?: AbortSignal,
  limit?: number,
  cursor?: string
): Promise<AnomaliesResponse> {
  const params = new URLSearchParams()
  params.set('window', window)
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (cursor) params.set('cursor', cursor)
  return getJSON<AnomaliesResponse>(`/api/anomalies?${params.toString()}`, signal)
}

/**
 * Fetch forecast data with horizon
 * @param horizon - Forecast horizon (e.g., '60m', '120m')
 */
export function fetchForecast(
  horizon: string = '60m',
  signal?: AbortSignal
): Promise<ForecastResponse> {
  return getJSON<ForecastResponse>(`/api/forecast?horizon=${horizon}`, signal)
}

/**
 * Fetch recommendations with optional namespace filter
 * @param namespace - Kubernetes namespace or 'all'
 */
export function fetchRecommendations(
  namespace: string = 'all',
  signal?: AbortSignal,
  limit?: number,
  cursor?: string
): Promise<RecommendationsResponse> {
  const params = new URLSearchParams()
  if (namespace && namespace !== 'all') params.set('namespace', namespace)
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (cursor) params.set('cursor', cursor)
  const query = params.toString()
  const url = query ? `/api/recommendations?${query}` : '/api/recommendations'
  return getJSON<RecommendationsResponse>(url, signal)
}

export const fetchAlerts = (
  statusOrSignal?: string | AbortSignal,
  signalMaybe?: AbortSignal,
  limit?: number,
  cursor?: string
) => {
  const status = typeof statusOrSignal === 'string' ? statusOrSignal : undefined
  const signal = statusOrSignal instanceof AbortSignal ? statusOrSignal : signalMaybe
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (cursor) params.set('cursor', cursor)
  const query = params.toString()
  const url = query ? `/api/alerts?${query}` : '/api/alerts'
  return getJSON<AlertsListResponse>(url, signal)
}

export const ackAlert = (id: string) =>
  postJSON<AlertItem>(`/api/alerts/${id}/ack`, {})

export const resolveAlert = (id: string) =>
  postJSON<AlertItem>(`/api/alerts/${id}/resolve`, {})

export const clearAlerts = () =>
  postJSON<ClearAlertsResponse>(`/api/alerts/clear`, {})

export const fetchAudit = (limit = 200, cursor?: string, signal?: AbortSignal) => {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (cursor) params.set('cursor', cursor)
  const url = `/api/audit?${params.toString()}`
  return getJSON<AuditListResponse>(url, signal)
}

export const fetchMode = (signal?: AbortSignal) =>
  getJSON<ModeStatusResponse>('/api/mode', signal)

export const setMode = (mode: 'demo' | 'prometheus' | 'auto') =>
  postJSON('/api/mode', { mode })

export const applyRecommendation = (id: string) =>
  postJSON(`/api/recommendations/${id}/apply`, {})

export const dismissRecommendation = (id: string) =>
  postJSON(`/api/recommendations/${id}/dismiss`, {})

export const snoozeRecommendation = (id: string) =>
  postJSON(`/api/recommendations/${id}/snooze`, {})
