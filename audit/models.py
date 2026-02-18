from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class AuditEvent(BaseModel):
    id: str
    ts: str
    actor_email: str
    actor_role: str
    action: str
    target_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AuditListResponse(BaseModel):
    events: list[AuditEvent]
    next_cursor: Optional[str] = None
