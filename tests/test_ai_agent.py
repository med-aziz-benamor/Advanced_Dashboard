from datetime import datetime, timedelta

from alerts.store import ALERT_STORE
from ai.agent import run_ai_analysis
from ai.anomaly_engine import detect_anomalies
from ai.forecast_engine import forecast_load
from ai.recommendation_engine import generate_recommendations


def _feature(cpu: float, mem: float, storage: float, network: float, ts: datetime):
    return {
        "cpu_usage": cpu,
        "memory_usage": mem,
        "storage_usage": storage,
        "network_io": network,
        "anomaly_count": 0,
        "timestamp": ts,
    }


def test_anomaly_detection_threshold_and_delta_logic():
    base_ts = datetime(2026, 2, 17, 12, 0, 0)
    history = [
        _feature(55.0, 72.0, 40.0, 50.0, base_ts - timedelta(minutes=10)),
        _feature(60.0, 74.0, 41.0, 60.0, base_ts - timedelta(minutes=5)),
    ]
    current = _feature(88.0, 91.0, 42.0, 100.0, base_ts)

    anomalies = detect_anomalies(current, history)
    anomaly_types = {item["type"] for item in anomalies}

    assert "cpu_spike" in anomaly_types
    assert "memory_pressure" in anomaly_types
    assert "network_spike" in anomaly_types


def test_forecast_peak_and_risk_level_are_computed():
    base_ts = datetime(2026, 2, 17, 12, 0, 0)
    history = [
        _feature(70.0 + i * 2.5, 70.0, 45.0, 35.0, base_ts - timedelta(minutes=(9 - i) * 5))
        for i in range(10)
    ]

    forecast = forecast_load(history, points=8)

    assert forecast["trend"] == "increasing"
    assert forecast["risk_level"] == "high"
    assert forecast["predicted_peak"] >= 85.0
    assert len(forecast["forecast_series"]) == 8


def test_recommendation_generation_from_anomalies_and_risk():
    ts = datetime(2026, 2, 17, 12, 0, 0)
    features = _feature(92.0, 93.0, 88.0, 40.0, ts)
    anomalies = [
        {
            "type": "cpu_spike",
            "severity": "critical",
            "confidence": 0.92,
            "explanation": "CPU exceeded threshold",
        },
        {
            "type": "memory_pressure",
            "severity": "critical",
            "confidence": 0.9,
            "explanation": "Memory exceeded threshold",
        },
    ]
    forecast = {
        "predicted_peak": 92.4,
        "peak_time": ts.isoformat(),
        "trend": "increasing",
        "risk_level": "high",
        "confidence": 0.87,
        "forecast_series": [],
    }

    recs = generate_recommendations(features, anomalies, forecast)
    rec_types = {item["type"] for item in recs}

    assert "scale_deployment" in rec_types
    assert "tune_memory_limits" in rec_types
    assert "proactive_scaling" in rec_types
    assert "storage_optimization" in rec_types


def test_run_ai_analysis_is_deterministic_with_fixed_input():
    ALERT_STORE.clear_all()

    base_ts = datetime(2026, 2, 17, 12, 0, 0)
    payload = {
        "timestamp": base_ts.isoformat(),
        "active_anomalies": 1,
        "cluster_metrics": {
            "cpu_usage": 90.0,
            "memory_usage": 88.0,
            "storage_usage": 52.0,
            "network_io": 70.0,
        },
    }
    history_payload = [
        {
            "timestamp": (base_ts - timedelta(minutes=15)).isoformat(),
            "cpu_usage": 60.0,
            "memory_usage": 82.0,
            "storage_usage": 50.0,
            "network_io": 40.0,
            "anomaly_count": 0,
        },
        {
            "timestamp": (base_ts - timedelta(minutes=10)).isoformat(),
            "cpu_usage": 68.0,
            "memory_usage": 84.0,
            "storage_usage": 51.0,
            "network_io": 45.0,
            "anomaly_count": 0,
        },
        {
            "timestamp": (base_ts - timedelta(minutes=5)).isoformat(),
            "cpu_usage": 75.0,
            "memory_usage": 86.0,
            "storage_usage": 52.0,
            "network_io": 50.0,
            "anomaly_count": 1,
        },
    ]

    first = run_ai_analysis(payload, mode="demo", history_payload=history_payload)
    ALERT_STORE.clear_all()
    second = run_ai_analysis(payload, mode="demo", history_payload=history_payload)

    first["ai_meta"]["analysis_time_ms"] = 0
    second["ai_meta"]["analysis_time_ms"] = 0
    first["alerts_summary"]["updated_at"] = "fixed"
    second["alerts_summary"]["updated_at"] = "fixed"

    assert first == second
