"""Deterministic recommendation generation from anomalies and forecast."""
from typing import List

from .schemas import AgentAnomaly, FeatureVector, ForecastResult, Recommendation


def _contains(anomalies: List[AgentAnomaly], anomaly_type: str) -> bool:
    return any(item["type"] == anomaly_type for item in anomalies)


def generate_recommendations(
    features: FeatureVector,
    anomalies: List[AgentAnomaly],
    forecast: ForecastResult,
) -> List[Recommendation]:
    recommendations: List[Recommendation] = []

    if _contains(anomalies, "cpu_spike"):
        recommendations.append(
            {
                "type": "scale_deployment",
                "priority": "high",
                "target": "deployment/api",
                "reason": "CPU anomaly indicates sustained pressure",
                "confidence": 0.88,
                "impact": "Reduces throttling and latency",
            }
        )

    if _contains(anomalies, "memory_pressure"):
        recommendations.append(
            {
                "type": "tune_memory_limits",
                "priority": "high",
                "target": "deployment/api",
                "reason": "Memory exceeded safe operating threshold",
                "confidence": 0.9,
                "impact": "Prevents OOM kills",
            }
        )

    if forecast["risk_level"] == "high":
        recommendations.append(
            {
                "type": "proactive_scaling",
                "priority": "high",
                "target": "deployment/api",
                "reason": f"Forecast peak at {forecast['predicted_peak']}%",
                "confidence": 0.87,
                "impact": "Prevents SLA breach during predicted peak",
            }
        )

    if features["storage_usage"] > 85.0:
        recommendations.append(
            {
                "type": "storage_optimization",
                "priority": "medium",
                "target": "namespace/logging",
                "reason": "Storage usage is above 85%",
                "confidence": 0.84,
                "impact": "Avoids storage saturation",
            }
        )

    if not recommendations:
        recommendations.append(
            {
                "type": "maintain_baseline",
                "priority": "low",
                "target": "cluster/all",
                "reason": "No critical risk detected",
                "confidence": 0.8,
                "impact": "Keeps cluster stable while monitoring",
            }
        )

    return recommendations
