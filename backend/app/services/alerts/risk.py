"""Deterministic SLA risk scoring."""
from datetime import datetime
from typing import Any, Dict, List


def _parse_time_to_impact_minutes(peak_time: str, current_ts: datetime) -> int:
    try:
        peak_dt = datetime.fromisoformat(peak_time)
        return max(0, int((peak_dt - current_ts).total_seconds() // 60))
    except (ValueError, TypeError):
        return 60


def compute_sla_risk(
    features: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    forecast: Dict[str, Any],
    recommendations: List[Dict[str, Any]],
) -> Dict[str, Any]:
    cpu = float(features.get("cpu_usage", 0.0))
    memory = float(features.get("memory_usage", 0.0))
    storage = float(features.get("storage_usage", 0.0))

    forecast_peak = float(forecast.get("predicted_peak", 0.0))
    forecast_risk = str(forecast.get("risk_level", "low"))

    anomaly_severity_score = 0
    drivers: List[str] = []
    for anomaly in anomalies:
        severity = anomaly.get("severity")
        if severity == "critical":
            anomaly_severity_score += 25
            drivers.append(f"Critical anomaly active: {anomaly.get('type', 'unknown')}")
        elif severity == "high":
            anomaly_severity_score += 15
            drivers.append(f"High anomaly active: {anomaly.get('type', 'unknown')}")
        elif severity == "warning":
            anomaly_severity_score += 8

    score = 0
    score += int(cpu * 0.20)
    score += int(memory * 0.18)
    score += int(storage * 0.08)
    score += anomaly_severity_score

    if forecast_risk == "high":
        score += 20
        drivers.append("CPU forecast peak high")
    elif forecast_risk == "moderate":
        score += 10
        drivers.append("CPU forecast peak moderate")

    if forecast_peak >= 95:
        score += 12
        drivers.append("Forecast peak exceeds 95%")

    critical_reco_count = sum(1 for rec in recommendations if rec.get("priority") == "critical")
    if critical_reco_count:
        score += min(critical_reco_count * 4, 12)
        drivers.append("Critical recommendations generated")

    score = max(0, min(100, score))

    if score >= 85 or (forecast_risk == "high" and anomaly_severity_score >= 25):
        risk_level = "critical"
    elif score >= 65:
        risk_level = "high"
    elif score >= 40:
        risk_level = "moderate"
    else:
        risk_level = "low"

    current_ts = features.get("timestamp")
    if isinstance(current_ts, str):
        try:
            current_ts = datetime.fromisoformat(current_ts)
        except ValueError:
            current_ts = datetime.now()
    elif not isinstance(current_ts, datetime):
        current_ts = datetime.now()

    time_to_impact = _parse_time_to_impact_minutes(forecast.get("peak_time"), current_ts)
    if risk_level in {"high", "critical"} and time_to_impact > 120:
        time_to_impact = 120

    confidence = 0.72
    if anomalies:
        confidence += 0.1
    if forecast_risk in {"high", "moderate"}:
        confidence += 0.08
    if len(drivers) >= 3:
        confidence += 0.05
    confidence = round(max(0.5, min(0.97, confidence)), 2)

    if not drivers:
        drivers.append("No major saturation or anomaly drivers detected")

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "time_to_impact_minutes": int(time_to_impact),
        "drivers": drivers,
        "confidence": confidence,
    }
