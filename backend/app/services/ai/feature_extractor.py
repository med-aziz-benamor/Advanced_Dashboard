"""Feature extraction and normalization for demo and Prometheus payloads."""
from datetime import datetime
from typing import Any, Dict, Optional

from .schemas import FeatureVector


def _to_float(value: Any, default: float = 0.0) -> float:
    """Normalize numeric-like values into float."""
    if value is None:
        return default

    if isinstance(value, (int, float)):
        return float(value)

    if isinstance(value, str):
        cleaned = value.strip().lower().replace(",", "")
        multiplier = 1.0

        if cleaned.endswith("mbps"):
            cleaned = cleaned[:-4].strip()
        elif cleaned.endswith("gbps"):
            cleaned = cleaned[:-4].strip()
            multiplier = 1000.0
        elif cleaned.endswith("kbps"):
            cleaned = cleaned[:-4].strip()
            multiplier = 0.001

        if cleaned.endswith("%"):
            cleaned = cleaned[:-1].strip()

        try:
            return float(cleaned) * multiplier
        except ValueError:
            return default

    return default


def _to_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(value)

    if isinstance(value, str):
        try:
            return int(float(value.strip()))
        except ValueError:
            return default

    return default


def extract_features(
    source: Optional[Dict[str, Any]],
    *,
    anomalies_count: Optional[int] = None,
    timestamp: Optional[datetime] = None,
) -> FeatureVector:
    """Extract a normalized feature vector from overview-like payloads."""
    source = source or {}
    cluster_metrics = source.get("cluster_metrics") or {}

    cpu_usage = _to_float(cluster_metrics.get("cpu_usage"), _to_float(source.get("cpu_usage"), 0.0))
    memory_usage = _to_float(cluster_metrics.get("memory_usage"), _to_float(source.get("memory_usage"), 0.0))
    storage_usage = _to_float(cluster_metrics.get("storage_usage"), _to_float(source.get("storage_usage"), 0.0))
    network_io = _to_float(cluster_metrics.get("network_io"), _to_float(source.get("network_io"), 0.0))

    count_default = _to_int(source.get("active_anomalies"), 0)
    anomaly_count = anomalies_count if anomalies_count is not None else count_default

    source_timestamp = source.get("timestamp")
    if timestamp is not None:
        resolved_timestamp = timestamp
    elif isinstance(source_timestamp, datetime):
        resolved_timestamp = source_timestamp
    elif isinstance(source_timestamp, str):
        try:
            resolved_timestamp = datetime.fromisoformat(source_timestamp)
        except ValueError:
            resolved_timestamp = datetime.now()
    else:
        resolved_timestamp = datetime.now()

    return {
        "cpu_usage": max(0.0, cpu_usage),
        "memory_usage": max(0.0, memory_usage),
        "storage_usage": max(0.0, storage_usage),
        "network_io": max(0.0, network_io),
        "anomaly_count": max(0, int(anomaly_count)),
        "timestamp": resolved_timestamp,
    }
