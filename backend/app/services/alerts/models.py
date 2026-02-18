"""Pydantic models for alerting subsystem."""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

AlertSeverity = Literal["info", "warning", "critical"]
AlertStatus = Literal["active", "acknowledged", "resolved"]


class Alert(BaseModel):
    id: str
    type: str
    severity: AlertSeverity
    status: AlertStatus
    title: str
    message: str
    source: str
    created_at: str
    updated_at: str
    fingerprint: str
    entity: Optional[Dict[str, Any]] = None
    explanation: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None


class AlertListResponse(BaseModel):
    alerts: List[Alert]
    total: int
    count: int
    generated_at: Optional[str] = None
    next_cursor: Optional[str] = None


class AckRequest(BaseModel):
    actor: str = Field(default="system", min_length=3)


class ResolveRequest(BaseModel):
    actor: str = Field(default="system", min_length=3)
