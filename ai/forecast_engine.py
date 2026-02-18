"""Deterministic lightweight load forecasting."""
from datetime import datetime, timedelta
from typing import List, Sequence

from .schemas import FeatureVector, ForecastResult


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _linear_regression(values: Sequence[float]) -> tuple[float, float]:
    n = len(values)
    if n < 2:
        return 0.0, values[-1] if values else 0.0

    x_vals = list(range(n))
    x_mean = sum(x_vals) / n
    y_mean = sum(values) / n

    numerator = sum((x_vals[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((x - x_mean) ** 2 for x in x_vals)

    slope = numerator / denominator if denominator else 0.0
    intercept = y_mean - slope * x_mean
    return slope, intercept


def forecast_load(
    history: Sequence[FeatureVector],
    *,
    points: int = 12,
    interval_minutes: int = 5,
) -> ForecastResult:
    """Predict near-future CPU load with deterministic linear extrapolation."""
    if not history:
        now = datetime.now()
        return {
            "predicted_peak": 0.0,
            "peak_time": now.isoformat(),
            "trend": "stable",
            "risk_level": "low",
            "confidence": 0.6,
            "forecast_series": [],
        }

    values = [point["cpu_usage"] for point in history]
    slope, intercept = _linear_regression(values)

    n = len(values)
    base_ts = history[-1]["timestamp"]

    series: List[dict] = []
    for i in range(1, points + 1):
        idx = n + i
        predicted = _clamp(intercept + slope * idx, 0.0, 100.0)
        width = 4.0 + abs(slope)

        ts = base_ts + timedelta(minutes=i * interval_minutes)
        series.append(
            {
                "timestamp": ts.isoformat(),
                "value": round(predicted, 2),
                "lower_bound": round(_clamp(predicted - width, 0.0, 100.0), 2),
                "upper_bound": round(_clamp(predicted + width, 0.0, 100.0), 2),
            }
        )

    peak = max(series, key=lambda item: item["value"]) if series else {
        "value": round(values[-1], 2),
        "timestamp": base_ts.isoformat(),
    }

    if slope > 0.5:
        trend = "increasing"
    elif slope < -0.5:
        trend = "decreasing"
    else:
        trend = "stable"

    predicted_peak = float(peak["value"])
    if predicted_peak >= 85.0:
        risk_level = "high"
    elif predicted_peak >= 70.0:
        risk_level = "moderate"
    else:
        risk_level = "low"

    mean_val = sum(values) / len(values)
    variance = sum((v - mean_val) ** 2 for v in values) / len(values)
    volatility_penalty = min(0.25, variance / 400.0)
    confidence = round(_clamp(0.9 - volatility_penalty, 0.6, 0.95), 2)

    return {
        "predicted_peak": round(predicted_peak, 2),
        "peak_time": peak["timestamp"],
        "trend": trend,
        "risk_level": risk_level,
        "confidence": confidence,
        "forecast_series": series,
    }
