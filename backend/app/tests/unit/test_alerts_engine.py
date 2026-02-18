from datetime import datetime, timedelta

from alerts.engine import generate_alerts
from alerts.explain import explain_anomaly
from alerts.models import Alert
from alerts.risk import compute_sla_risk
from alerts.store import ALERT_STORE, AlertStore


def _sample_ai_result(ts: datetime) -> dict:
    return {
        "anomalies": [
            {
                "type": "cpu_spike",
                "severity": "critical",
                "confidence": 0.92,
                "explanation": "CPU exceeded 85% threshold",
                "explanation_detail": {
                    "summary": "CPU exceeded threshold",
                    "signals": [],
                    "logic": ["cpu_usage > 85%"],
                    "confidence_reason": "multiple signal agreement",
                },
            }
        ],
        "forecast": {
            "predicted_peak": 93.0,
            "peak_time": (ts + timedelta(minutes=30)).isoformat(),
            "trend": "increasing",
            "risk_level": "high",
            "confidence": 0.86,
            "forecast_series": [],
            "explanation_detail": {
                "summary": "Forecast high risk",
                "signals": [],
                "logic": ["linear_trend_forecast"],
                "confidence_reason": "stable trend",
            },
        },
        "recommendations": [
            {
                "type": "security_hardening",
                "priority": "critical",
                "target": "deployment/api",
                "reason": "Harden security policy",
                "confidence": 0.91,
                "impact": "Reduce breach risk",
                "explanation_detail": {
                    "summary": "Security action needed",
                    "signals": [],
                    "logic": ["derived_from_anomalies_and_forecast"],
                    "confidence_reason": "direct mapping",
                },
            }
        ],
        "sla_risk": {
            "risk_score": 88,
            "risk_level": "critical",
            "time_to_impact_minutes": 30,
            "drivers": ["Critical anomaly active"],
            "confidence": 0.9,
        },
    }


def test_store_dedupe_behavior_and_occurrence_counter():
    clock = {"now": datetime(2026, 2, 17, 12, 0, 0)}

    def now_provider() -> datetime:
        return clock["now"]

    store = AlertStore(time_provider=now_provider)

    alert = Alert(
        id="",
        type="cpu_spike",
        severity="critical",
        status="active",
        title="CPU Spike",
        message="CPU > 85%",
        source="ai",
        created_at=clock["now"].isoformat(),
        updated_at=clock["now"].isoformat(),
        fingerprint="cpu_spike|node=n1|mode=demo",
        entity={"node": "n1"},
        explanation=None,
        meta=None,
    )

    first = store.upsert_alert(alert)
    clock["now"] = clock["now"] + timedelta(minutes=5)
    second = store.upsert_alert(alert)

    assert first.id == second.id
    assert second.meta["occurrences"] == 2
    assert len(store.list_alerts()) == 1


def test_fingerprint_stability_for_same_inputs():
    from alerts.engine import _fingerprint

    entity = {"cluster": "k8s-openstack", "node": "worker1"}
    fp1 = _fingerprint("cpu_spike", entity, "demo")
    fp2 = _fingerprint("cpu_spike", {"node": "worker1", "cluster": "k8s-openstack"}, "demo")
    assert fp1 == fp2


def test_ack_and_resolve_transitions():
    store = AlertStore(time_provider=lambda: datetime(2026, 2, 17, 12, 0, 0))
    model = Alert(
        id="",
        type="sla_risk",
        severity="warning",
        status="active",
        title="SLA Risk",
        message="Risk rising",
        source="ai",
        created_at="2026-02-17T12:00:00",
        updated_at="2026-02-17T12:00:00",
        fingerprint="sla_risk|cluster=k8s-openstack|mode=demo",
        entity={"cluster": "k8s-openstack"},
        explanation=None,
        meta=None,
    )
    created = store.upsert_alert(model)

    acked = store.acknowledge(created.id, "ops@example.com")
    assert acked.status == "acknowledged"
    assert acked.meta["ack_by"] == "ops@example.com"

    resolved = store.resolve(created.id, "admin@example.com")
    assert resolved.status == "resolved"
    assert resolved.meta["resolved_by"] == "admin@example.com"


def test_sla_risk_scoring_thresholds():
    ts = datetime(2026, 2, 17, 12, 0, 0)
    features = {
        "cpu_usage": 92.0,
        "memory_usage": 90.0,
        "storage_usage": 75.0,
        "network_io": 60.0,
        "timestamp": ts.isoformat(),
    }
    anomalies = [{"type": "cpu_spike", "severity": "critical", "confidence": 0.9}]
    forecast = {
        "predicted_peak": 96.0,
        "peak_time": (ts + timedelta(minutes=20)).isoformat(),
        "risk_level": "high",
    }
    recs = [{"type": "proactive_scaling", "priority": "critical"}]

    risk = compute_sla_risk(features, anomalies, forecast, recs)
    assert risk["risk_score"] >= 65
    assert risk["risk_level"] in {"high", "critical"}
    assert risk["time_to_impact_minutes"] <= 120
    assert risk["confidence"] >= 0.72


def test_explainability_structure_presence():
    ts = datetime(2026, 2, 17, 12, 0, 0)
    anomaly = {
        "type": "cpu_spike",
        "severity": "critical",
        "confidence": 0.92,
        "explanation": "CPU exceeded 85% threshold",
    }
    features = {
        "cpu_usage": 95.0,
        "memory_usage": 70.0,
        "storage_usage": 50.0,
        "network_io": 40.0,
        "timestamp": ts.isoformat(),
    }
    history = [{"cpu_usage": 72.0, "network_io": 30.0, "timestamp": (ts - timedelta(minutes=5)).isoformat()}]

    explained = explain_anomaly(anomaly, features, history)
    assert "summary" in explained
    assert "signals" in explained
    assert "logic" in explained
    assert "confidence_reason" in explained


def test_generate_alerts_creates_expected_types():
    ALERT_STORE.clear_all()
    ts = datetime(2026, 2, 17, 12, 0, 0)
    payload = _sample_ai_result(ts)

    generated = generate_alerts(payload, mode="demo")
    generated_types = {item.type for item in generated}

    assert "cpu_spike" in generated_types
    assert "sla_risk" in generated_types
    assert "forecast_risk" in generated_types
    assert "critical_security_recommendation" in generated_types
    ALERT_STORE.clear_all()
