from __future__ import annotations

from typing import Optional

from .models import AuditEvent


class AuditStore:
    def __init__(self, max_size: int = 2000):
        self._max_size = max_size
        self._events: list[AuditEvent] = []
        self._sequence = 0

    def _next_id(self) -> str:
        self._sequence += 1
        return f"audit-{self._sequence:08d}"

    def append(self, event: AuditEvent) -> AuditEvent:
        payload = AuditEvent(
            id=event.id or self._next_id(),
            ts=event.ts,
            actor_email=event.actor_email,
            actor_role=event.actor_role,
            action=event.action,
            target_id=event.target_id,
            metadata=event.metadata or {},
        )
        self._events.append(payload)
        if len(self._events) > self._max_size:
            overflow = len(self._events) - self._max_size
            del self._events[:overflow]
        return payload

    def list_events(self, actor, limit: int = 200, cursor: Optional[str] = None) -> tuple[list[AuditEvent], Optional[str]]:
        if actor.role == "admin":
            visible = list(self._events)
        else:
            visible = [event for event in self._events if event.actor_email == actor.email]

        visible.sort(key=lambda item: item.ts, reverse=True)

        start = 0
        if cursor:
            for idx, event in enumerate(visible):
                if event.id == cursor:
                    start = idx + 1
                    break

        safe_limit = max(1, min(limit, 500))
        page = visible[start:start + safe_limit]
        next_cursor = page[-1].id if start + safe_limit < len(visible) and page else None
        return page, next_cursor

    def clear(self) -> None:
        self._events.clear()


AUDIT_STORE = AuditStore()
