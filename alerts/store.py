"""In-memory alert store with fingerprint dedupe and lifecycle transitions."""
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional

from .models import Alert


class AlertStore:
    """Simple in-memory alert store with deterministic dedupe behavior."""

    def __init__(self, *, time_provider: Optional[Callable[[], datetime]] = None, dedupe_window_minutes: int = 10):
        self._alerts: Dict[str, Alert] = {}
        self._fingerprint_index: Dict[str, str] = {}
        self._time_provider = time_provider or datetime.now
        self._dedupe_window = timedelta(minutes=dedupe_window_minutes)
        self._sequence = 0

    def _now(self) -> datetime:
        return self._time_provider()

    def _new_id(self) -> str:
        self._sequence += 1
        return f"alert-{self._sequence:06d}"

    def upsert_alert(self, alert: Alert) -> Alert:
        now = self._now()
        alert_fp = alert.fingerprint

        existing_id = self._fingerprint_index.get(alert_fp)
        if existing_id and existing_id in self._alerts:
            existing = self._alerts[existing_id]
            last_updated = datetime.fromisoformat(existing.updated_at)

            if now - last_updated <= self._dedupe_window:
                meta = dict(existing.meta or {})
                meta["occurrences"] = int(meta.get("occurrences", 1)) + 1
                meta["last_message"] = alert.message
                existing.message = alert.message
                existing.updated_at = now.isoformat()
                existing.meta = meta
                self._alerts[existing.id] = existing
                return existing

        created_at = alert.created_at or now.isoformat()
        updated_at = alert.updated_at or now.isoformat()
        model = Alert(
            id=alert.id or self._new_id(),
            type=alert.type,
            severity=alert.severity,
            status=alert.status,
            title=alert.title,
            message=alert.message,
            source=alert.source,
            created_at=created_at,
            updated_at=updated_at,
            fingerprint=alert_fp,
            entity=alert.entity,
            explanation=alert.explanation,
            meta={"occurrences": 1, **(alert.meta or {})},
        )

        self._alerts[model.id] = model
        self._fingerprint_index[alert_fp] = model.id
        return model

    def list_alerts(self, status: Optional[str] = None) -> List[Alert]:
        alerts = list(self._alerts.values())
        if status:
            alerts = [item for item in alerts if item.status == status]
        alerts.sort(key=lambda item: item.updated_at, reverse=True)
        return alerts

    def get_alert(self, alert_id: str) -> Optional[Alert]:
        return self._alerts.get(alert_id)

    def acknowledge(self, alert_id: str, actor: str) -> Alert:
        alert = self._alerts.get(alert_id)
        if not alert:
            raise KeyError(f"Alert not found: {alert_id}")

        alert.status = "acknowledged"
        alert.updated_at = self._now().isoformat()
        meta = dict(alert.meta or {})
        meta["ack_by"] = actor
        alert.meta = meta
        self._alerts[alert_id] = alert
        return alert

    def resolve(self, alert_id: str, actor: str) -> Alert:
        alert = self._alerts.get(alert_id)
        if not alert:
            raise KeyError(f"Alert not found: {alert_id}")

        alert.status = "resolved"
        alert.updated_at = self._now().isoformat()
        meta = dict(alert.meta or {})
        meta["resolved_by"] = actor
        alert.meta = meta
        self._alerts[alert_id] = alert
        return alert

    def clear_all(self) -> int:
        count = len(self._alerts)
        self._alerts.clear()
        self._fingerprint_index.clear()
        return count


ALERT_STORE = AlertStore()
