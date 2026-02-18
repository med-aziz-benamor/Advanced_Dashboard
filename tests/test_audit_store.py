from datetime import datetime

from audit.models import AuditEvent
from audit.store import AuditStore


class Actor:
    def __init__(self, email: str, role: str):
        self.email = email
        self.role = role


def _event(ts: str, action: str, actor_email: str, actor_role: str = "operator") -> AuditEvent:
    return AuditEvent(
        id="",
        ts=ts,
        actor_email=actor_email,
        actor_role=actor_role,
        action=action,
        target_id=None,
        metadata={},
    )


def test_append_and_max_size_trim():
    store = AuditStore(max_size=2)
    store.append(_event("2026-02-17T10:00:00", "a", "ops@example.com"))
    store.append(_event("2026-02-17T10:01:00", "b", "ops@example.com"))
    store.append(_event("2026-02-17T10:02:00", "c", "ops@example.com"))

    events, _ = store.list_events(Actor("admin@example.com", "admin"), limit=10)
    assert len(events) == 2
    assert events[0].action == "c"
    assert events[1].action == "b"


def test_role_scoped_listing_and_cursor():
    store = AuditStore(max_size=10)
    base = datetime(2026, 2, 17, 12, 0, 0)

    for i in range(5):
        store.append(
            _event(
                (base.replace(minute=i)).isoformat(),
                f"action-{i}",
                "ops@example.com",
            )
        )

    store.append(_event("2026-02-17T12:10:00", "admin-action", "admin@example.com", "admin"))

    operator_page_1, operator_cursor = store.list_events(Actor("ops@example.com", "operator"), limit=2)
    operator_page_2, _ = store.list_events(Actor("ops@example.com", "operator"), limit=2, cursor=operator_cursor)

    assert len(operator_page_1) == 2
    assert len(operator_page_2) == 2
    assert all(item.actor_email == "ops@example.com" for item in operator_page_1 + operator_page_2)

    admin_events, _ = store.list_events(Actor("admin@example.com", "admin"), limit=20)
    assert any(item.actor_email == "admin@example.com" for item in admin_events)
    assert any(item.actor_email == "ops@example.com" for item in admin_events)
