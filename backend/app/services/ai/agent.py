"""Unified AIOps orchestration agent."""
from datetime import datetime, timedelta
from time import perf_counter
from typing import Any, Dict, List, Optional

from backend.app.services.alerts.engine import generate_alerts
from backend.app.services.alerts.explain import explain_anomaly, explain_forecast, explain_recommendation
from backend.app.services.alerts.risk import compute_sla_risk
from backend.app.services.alerts.store import ALERT_STORE

from .anomaly_engine import detect_anomalies
from .feature_extractor import extract_features
from .forecast_engine import forecast_load
from .recommendation_engine import generate_recommendations
from .schemas import AgentOutput, FeatureVector

AGENT_VERSION = "1.0"


def _build_history(current: FeatureVector, history: Optional[List[Dict[str, Any]]] = None) -> List[FeatureVector]:
    """Normalize optional history payload into feature vectors."""
    if history:
        normalized: List[FeatureVector] = []
        for index, point in enumerate(history):
            ts = point.get("timestamp")
            if isinstance(ts, str):
                try:
                    point_ts = datetime.fromisoformat(ts)
                except ValueError:
                    point_ts = datetime.now() - timedelta(minutes=(len(history) - index) * 5)
            else:
                point_ts = datetime.now() - timedelta(minutes=(len(history) - index) * 5)

            normalized.append(
                extract_features(
                    {
                        "cluster_metrics": {
                            "cpu_usage": point.get("cpu_usage", point.get("value", current["cpu_usage"])),
                            "memory_usage": point.get("memory_usage", current["memory_usage"]),
                            "storage_usage": point.get("storage_usage", current["storage_usage"]),
                            "network_io": point.get("network_io", current["network_io"]),
                        },
                        "active_anomalies": point.get("anomaly_count", current["anomaly_count"]),
                        "timestamp": point_ts.isoformat(),
                    },
                    timestamp=point_ts,
                )
            )

        return normalized

    now = current["timestamp"]
    # Deterministic synthetic short history around current value.
    return [
        {
            **current,
            "cpu_usage": max(0.0, current["cpu_usage"] - 12.0),
            "timestamp": now - timedelta(minutes=10),
        },
        {
            **current,
            "cpu_usage": max(0.0, current["cpu_usage"] - 6.0),
            "timestamp": now - timedelta(minutes=5),
        },
        current,
    ]


def _health_score(features: FeatureVector, anomaly_count: int, risk_level: str) -> int:
    score = 100
    score -= int(features["cpu_usage"] * 0.22)
    score -= int(features["memory_usage"] * 0.2)
    score -= int(features["storage_usage"] * 0.1)
    score -= min(anomaly_count * 8, 35)

    if risk_level == "high":
        score -= 10
    elif risk_level == "moderate":
        score -= 5
    elif risk_level == "critical":
        score -= 15

    return max(0, min(100, score))


def _alerts_summary(now_iso: str) -> Dict[str, Any]:
    alerts = ALERT_STORE.list_alerts(status="active")
    return {
        "active": len(alerts),
        "critical": sum(1 for item in alerts if item.severity == "critical"),
        "updated_at": now_iso,
    }


def run_ai_analysis(
    metrics_payload: Dict[str, Any],
    *,
    mode: str,
    history_payload: Optional[List[Dict[str, Any]]] = None,
) -> AgentOutput:
    """Run deterministic AI analysis and return unified intelligence payload."""
    started = perf_counter()

    current_features = extract_features(metrics_payload)
    history = _build_history(current_features, history_payload)

    anomalies = detect_anomalies(current_features, history[:-1])
    forecast = forecast_load(history)
    recommendations = generate_recommendations(current_features, anomalies, forecast)

    features_view = {
        "cpu_usage": current_features["cpu_usage"],
        "memory_usage": current_features["memory_usage"],
        "storage_usage": current_features["storage_usage"],
        "network_io": current_features["network_io"],
        "timestamp": current_features["timestamp"].isoformat(),
    }

    history_view = [
        {
            "cpu_usage": point["cpu_usage"],
            "memory_usage": point["memory_usage"],
            "storage_usage": point["storage_usage"],
            "network_io": point["network_io"],
            "timestamp": point["timestamp"].isoformat(),
        }
        for point in history[:-1]
    ]

    for anomaly in anomalies:
        anomaly["explanation_detail"] = explain_anomaly(anomaly, features_view, history_view)

    forecast["explanation_detail"] = explain_forecast(forecast, features_view, history_view)

    for recommendation in recommendations:
        recommendation["explanation_detail"] = explain_recommendation(
            recommendation,
            features_view,
            anomalies,
            forecast,
        )

    sla_risk = compute_sla_risk(features_view, anomalies, forecast, recommendations)
    health = _health_score(current_features, len(anomalies), sla_risk["risk_level"])

    ai_result_for_alerts = {
        "anomalies": anomalies,
        "forecast": forecast,
        "recommendations": recommendations,
        "sla_risk": sla_risk,
    }
    generate_alerts(ai_result_for_alerts, mode)

    elapsed_ms = int((perf_counter() - started) * 1000)
    now_iso = datetime.now().isoformat()

    return {
        "health_score": health,
        "anomalies": anomalies,
        "forecast": forecast,
        "recommendations": recommendations,
        "sla_risk": sla_risk,
        "alerts_summary": _alerts_summary(now_iso),
        "ai_meta": {
            "mode": mode,
            "analysis_time_ms": elapsed_ms,
            "agent_version": AGENT_VERSION,
        },
    }
