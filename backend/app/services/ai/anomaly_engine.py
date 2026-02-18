"""Deterministic rule-based anomaly detection."""
from typing import List, Sequence

from .schemas import AgentAnomaly, FeatureVector


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _confidence(base: float, over_by: float, scale: float) -> float:
    raw = base + (over_by / scale)
    return round(_clamp(raw, 0.5, 0.99), 2)


def detect_anomalies(
    current: FeatureVector,
    history: Sequence[FeatureVector] | None = None,
) -> List[AgentAnomaly]:
    """Detect anomalies using threshold and delta rules."""
    anomalies: List[AgentAnomaly] = []
    history = history or []

    prev = history[-1] if history else None
    network_baseline = (
        sum(point["network_io"] for point in history) / len(history)
        if history
        else current["network_io"]
    )

    cpu = current["cpu_usage"]
    mem = current["memory_usage"]
    net = current["network_io"]

    cpu_delta = cpu - prev["cpu_usage"] if prev else 0.0
    if cpu > 85.0 or cpu_delta > 20.0:
        reason = "CPU exceeded 85% threshold" if cpu > 85.0 else "CPU increased by more than 20% in last window"
        severity = "critical" if cpu >= 95.0 or cpu_delta >= 30.0 else "high"
        over_by = max(cpu - 85.0, cpu_delta - 20.0, 0.0)
        anomalies.append(
            {
                "type": "cpu_spike",
                "severity": severity,
                "confidence": _confidence(0.78, over_by, 30.0),
                "explanation": reason,
            }
        )

    if mem > 90.0:
        anomalies.append(
            {
                "type": "memory_pressure",
                "severity": "critical" if mem >= 95.0 else "high",
                "confidence": _confidence(0.8, mem - 90.0, 20.0),
                "explanation": "Memory exceeded 90% threshold",
            }
        )

    if network_baseline > 0.0 and net > network_baseline * 1.5:
        anomalies.append(
            {
                "type": "network_spike",
                "severity": "high" if net < network_baseline * 2.0 else "critical",
                "confidence": _confidence(0.74, net - (network_baseline * 1.5), max(network_baseline, 1.0)),
                "explanation": "Network I/O spiked above 1.5x baseline",
            }
        )

    return anomalies
