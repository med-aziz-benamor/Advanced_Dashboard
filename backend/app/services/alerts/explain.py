"""Explainability helpers for anomalies, forecasts, and recommendations."""
from datetime import datetime
from typing import Any, Dict, List


def _safe_threshold_for(anomaly_type: str) -> float:
    mapping = {
        "cpu_spike": 85.0,
        "memory_pressure": 90.0,
        "network_spike": 1.5,
    }
    return mapping.get(anomaly_type, 0.0)


def explain_anomaly(anomaly: Dict[str, Any], features: Dict[str, Any], history: List[Dict[str, Any]]) -> Dict[str, Any]:
    cpu = float(features.get("cpu_usage", 0.0))
    mem = float(features.get("memory_usage", 0.0))
    net = float(features.get("network_io", 0.0))

    prev_cpu = float(history[-1].get("cpu_usage", cpu)) if history else cpu
    cpu_delta = round(cpu - prev_cpu, 2)
    baseline_net = round(sum(float(item.get("network_io", net)) for item in history) / len(history), 2) if history else net

    anomaly_type = str(anomaly.get("type", "unknown"))
    threshold = _safe_threshold_for(anomaly_type)

    if anomaly_type == "cpu_spike":
        signals = [
            {"name": "cpu_usage", "value": cpu, "threshold": 85.0, "contribution": "high"},
            {"name": "cpu_delta", "value": cpu_delta, "threshold": 20.0, "contribution": "medium"},
        ]
        logic = ["cpu_usage > 85%", "delta(cpu_usage) > 20%"]
    elif anomaly_type == "memory_pressure":
        signals = [{"name": "memory_usage", "value": mem, "threshold": 90.0, "contribution": "high"}]
        logic = ["memory_usage > 90%"]
    elif anomaly_type == "network_spike":
        signals = [
            {"name": "network_io", "value": net, "threshold": round(baseline_net * 1.5, 2), "contribution": "high"},
            {"name": "network_baseline", "value": baseline_net, "threshold": baseline_net, "contribution": "medium"},
        ]
        logic = ["network_io > baseline * 1.5"]
    else:
        signals = [{"name": "unknown_signal", "value": 0.0, "threshold": threshold, "contribution": "low"}]
        logic = ["rule_based_detection_triggered"]

    confidence = float(anomaly.get("confidence", 0.5))
    if confidence >= 0.9:
        confidence_reason = "Confidence boosted due to multiple signal agreement"
    elif confidence >= 0.75:
        confidence_reason = "Confidence moderate due to threshold breach"
    else:
        confidence_reason = "Confidence conservative due to limited signal strength"

    return {
        "summary": str(anomaly.get("explanation", "Anomaly detected by rule engine")),
        "signals": signals,
        "logic": logic,
        "confidence_reason": confidence_reason,
    }


def explain_forecast(forecast_result: Dict[str, Any], features: Dict[str, Any], history: List[Dict[str, Any]]) -> Dict[str, Any]:
    current_cpu = float(features.get("cpu_usage", 0.0))
    peak = float(forecast_result.get("predicted_peak", 0.0))
    trend = str(forecast_result.get("trend", "stable"))
    risk = str(forecast_result.get("risk_level", "low"))

    signals = [
        {"name": "current_cpu", "value": current_cpu, "threshold": 70.0, "contribution": "medium"},
        {"name": "predicted_peak", "value": peak, "threshold": 85.0, "contribution": "high" if peak >= 85 else "medium"},
    ]

    peak_time = forecast_result.get("peak_time")
    if isinstance(peak_time, str):
        try:
            tti = int((datetime.fromisoformat(peak_time) - datetime.fromisoformat(str(features.get("timestamp")))).total_seconds() // 60)
        except ValueError:
            tti = 60
    else:
        tti = 60

    return {
        "summary": f"Forecast trend is {trend} with {risk} risk and peak at {peak}%.",
        "signals": signals,
        "logic": ["linear_trend_forecast", "peak_based_risk_banding"],
        "confidence_reason": f"Confidence reflects history stability and trend consistency (TTI={max(tti, 0)}m).",
    }


def explain_recommendation(
    reco: Dict[str, Any],
    features: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    forecast: Dict[str, Any],
) -> Dict[str, Any]:
    rec_type = str(reco.get("type", "maintain_baseline"))
    peak = float(forecast.get("predicted_peak", 0.0))

    high_anomaly_count = sum(1 for item in anomalies if item.get("severity") in {"high", "critical"})

    signals = [
        {"name": "high_anomaly_count", "value": high_anomaly_count, "threshold": 1, "contribution": "high" if high_anomaly_count else "low"},
        {"name": "forecast_peak", "value": peak, "threshold": 85.0, "contribution": "high" if peak >= 85 else "medium"},
    ]

    logic = [
        f"recommendation_type={rec_type}",
        "derived_from_anomalies_and_forecast",
    ]

    confidence = float(reco.get("confidence", 0.7))
    if confidence >= 0.88:
        confidence_reason = "High confidence due to direct anomaly-to-action mapping"
    elif confidence >= 0.75:
        confidence_reason = "Moderate confidence due to forecast corroboration"
    else:
        confidence_reason = "Conservative confidence due to low urgency context"

    return {
        "summary": str(reco.get("reason", "Recommendation generated from orchestration rules")),
        "signals": signals,
        "logic": logic,
        "confidence_reason": confidence_reason,
    }
