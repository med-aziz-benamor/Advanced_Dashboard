"""Alert generation engine from AI outputs."""
from datetime import datetime
from typing import Any, Dict, List

from .models import Alert
from .store import ALERT_STORE


def _severity_for_anomaly(anomaly: Dict[str, Any]) -> str:
    severity = str(anomaly.get("severity", "warning"))
    if severity in {"critical", "high"}:
        return "critical"
    if severity == "warning":
        return "warning"
    return "info"


def _fingerprint(alert_type: str, entity: Dict[str, Any], mode: str) -> str:
    ordered = "|".join(f"{k}={entity[k]}" for k in sorted(entity.keys())) if entity else "entity=cluster"
    return f"{alert_type}|{ordered}|mode={mode}"


def generate_alerts(ai_result: Dict[str, Any], mode: str) -> List[Alert]:
    anomalies = ai_result.get("anomalies", [])
    recommendations = ai_result.get("recommendations", [])
    forecast = ai_result.get("forecast", {})
    sla_risk = ai_result.get("sla_risk", {})

    generated: List[Alert] = []
    now_iso = datetime.now().isoformat()

    for anomaly in anomalies:
        if anomaly.get("severity") not in {"critical", "high"}:
            continue

        entity = {"cluster": "k8s-openstack"}
        fp = _fingerprint(str(anomaly.get("type", "anomaly")), entity, mode)
        alert = Alert(
            id="",
            type=str(anomaly.get("type", "anomaly")),
            severity=_severity_for_anomaly(anomaly),
            status="active",
            title=f"Anomaly detected: {anomaly.get('type', 'unknown')}",
            message=str(anomaly.get("explanation", "Anomaly rule triggered")),
            source="ai",
            created_at=now_iso,
            updated_at=now_iso,
            fingerprint=fp,
            entity=entity,
            explanation=anomaly.get("explanation_detail"),
            meta={"confidence": anomaly.get("confidence", 0.7)},
        )
        generated.append(ALERT_STORE.upsert_alert(alert))

    risk_level = str(sla_risk.get("risk_level", "low"))
    if risk_level in {"high", "critical"}:
        entity = {"cluster": "k8s-openstack"}
        fp = _fingerprint("sla_risk", entity, mode)
        alert = Alert(
            id="",
            type="sla_risk",
            severity="critical" if risk_level == "critical" else "warning",
            status="active",
            title=f"SLA risk is {risk_level}",
            message=f"SLA risk score {sla_risk.get('risk_score', 0)} with impact in {sla_risk.get('time_to_impact_minutes', 60)} minutes",
            source="ai",
            created_at=now_iso,
            updated_at=now_iso,
            fingerprint=fp,
            entity=entity,
            explanation={
                "summary": "SLA risk derived from saturation, anomalies, and forecast.",
                "signals": [],
                "logic": ["weighted_risk_scoring"],
                "confidence_reason": "Multiple AI subsystems agree on elevated risk",
            },
            meta={"drivers": sla_risk.get("drivers", []), "confidence": sla_risk.get("confidence", 0.7)},
        )
        generated.append(ALERT_STORE.upsert_alert(alert))

    forecast_risk = str(forecast.get("risk_level", "low"))
    tti = int(sla_risk.get("time_to_impact_minutes", 999))
    if forecast_risk in {"high", "critical"} and tti <= 60:
        entity = {"cluster": "k8s-openstack"}
        fp = _fingerprint("forecast_risk", entity, mode)
        alert = Alert(
            id="",
            type="forecast_risk",
            severity="critical" if forecast_risk == "critical" else "warning",
            status="active",
            title="Near-term load impact forecast",
            message=f"Forecast peak {forecast.get('predicted_peak', 0)}% in <= {tti} minutes",
            source="ai",
            created_at=now_iso,
            updated_at=now_iso,
            fingerprint=fp,
            entity=entity,
            explanation=forecast.get("explanation_detail"),
            meta={"peak_time": forecast.get("peak_time")},
        )
        generated.append(ALERT_STORE.upsert_alert(alert))

    for rec in recommendations:
        if rec.get("priority") != "critical":
            continue
        if rec.get("type") not in {"security_hardening", "security", "security_policy"}:
            continue

        target = str(rec.get("target", "cluster/all"))
        entity = {"target": target}
        fp = _fingerprint("critical_security_recommendation", entity, mode)
        alert = Alert(
            id="",
            type="critical_security_recommendation",
            severity="critical",
            status="active",
            title="Critical security recommendation",
            message=str(rec.get("reason", "Security action required")),
            source="ai",
            created_at=now_iso,
            updated_at=now_iso,
            fingerprint=fp,
            entity=entity,
            explanation=rec.get("explanation_detail"),
            meta={"recommendation_type": rec.get("type")},
        )
        generated.append(ALERT_STORE.upsert_alert(alert))

    return generated
