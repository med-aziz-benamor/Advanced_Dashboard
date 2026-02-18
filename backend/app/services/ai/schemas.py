"""Schemas used by the deterministic AIOps agent."""
from datetime import datetime
from typing import Any, Dict, List, Literal, NotRequired, TypedDict


Severity = Literal["info", "warning", "high", "critical"]
Priority = Literal["low", "medium", "high", "critical"]
Trend = Literal["increasing", "decreasing", "stable"]
RiskLevel = Literal["low", "moderate", "high"]


class FeatureVector(TypedDict):
    cpu_usage: float
    memory_usage: float
    storage_usage: float
    network_io: float
    anomaly_count: int
    timestamp: datetime


class AgentAnomaly(TypedDict):
    type: str
    severity: Severity
    confidence: float
    explanation: str
    explanation_detail: NotRequired[Dict[str, Any]]


class ForecastResult(TypedDict):
    predicted_peak: float
    peak_time: str
    trend: Trend
    risk_level: RiskLevel
    confidence: float
    forecast_series: List[Dict[str, Any]]
    explanation_detail: NotRequired[Dict[str, Any]]


class Recommendation(TypedDict):
    type: str
    priority: Priority
    target: str
    reason: str
    confidence: float
    impact: str
    explanation_detail: NotRequired[Dict[str, Any]]


class SlaRisk(TypedDict):
    risk_score: int
    risk_level: Literal["low", "moderate", "high", "critical"]
    time_to_impact_minutes: int
    drivers: List[str]
    confidence: float


class AlertsSummary(TypedDict):
    active: int
    critical: int
    updated_at: str


class AgentMeta(TypedDict):
    mode: str
    analysis_time_ms: int
    agent_version: str


class AgentOutput(TypedDict):
    health_score: int
    anomalies: List[AgentAnomaly]
    forecast: ForecastResult
    recommendations: List[Recommendation]
    sla_risk: SlaRisk
    alerts_summary: AlertsSummary
    ai_meta: AgentMeta
