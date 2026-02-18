"""
Main FastAPI application for Advanced K8s Dashboard.
"""
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.services.prometheus.client import PrometheusClient, PrometheusUnavailable
from backend.app.services.prometheus.adapter import PrometheusAdapter
from backend.app.services.ai.agent import run_ai_analysis
from backend.app.services.alerts.models import Alert, AlertListResponse, AckRequest, ResolveRequest
from backend.app.services.alerts.store import ALERT_STORE
from backend.app.services.audit.store import AUDIT_STORE
from backend.app.services.audit.models import AuditEvent, AuditListResponse
from backend.app.core import security as auth

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global state
current_scenario: Optional[str] = None
scenario_applied_at: Optional[str] = None
active_data_mode: str = "demo"  # Will be set during startup
prometheus_client: Optional[PrometheusClient] = None
prometheus_adapter: Optional[PrometheusAdapter] = None
recommendation_actions: Dict[str, Dict[str, Any]] = {}


# Pydantic models for request/response
class ScenarioRequest(BaseModel):
    scenario: str

class ScenarioResponse(BaseModel):
    ok: bool
    scenario: str
    applied_at: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    global active_data_mode, prometheus_client, prometheus_adapter
    
    logger.info("Starting Advanced K8s Dashboard API")
    logger.info(f"Configured DATA_MODE: {settings.DATA_MODE}")
    logger.info(f"Prometheus URL: {settings.PROMETHEUS_BASE_URL}")
    
    # Initialize Prometheus client
    prometheus_client = PrometheusClient()
    
    # Determine active mode
    if settings.DATA_MODE == "demo":
        active_data_mode = "demo"
        logger.info("Running in DEMO mode (Prometheus disabled)")
    
    elif settings.DATA_MODE == "prometheus":
        active_data_mode = "prometheus"
        prometheus_adapter = PrometheusAdapter(prometheus_client)
        logger.info("Running in PROMETHEUS mode")
    
    elif settings.DATA_MODE == "auto":
        # Auto-detect: try Prometheus, fallback to demo
        if prometheus_client.check_availability():
            active_data_mode = "prometheus"
            prometheus_adapter = PrometheusAdapter(prometheus_client)
            logger.info("AUTO mode: Prometheus available - using PROMETHEUS mode")
        else:
            active_data_mode = "demo"
            logger.info("AUTO mode: Prometheus unavailable - using DEMO mode")
    
    else:
        logger.warning(f"Unknown DATA_MODE '{settings.DATA_MODE}', defaulting to demo")
        active_data_mode = "demo"
    
    yield
    
    logger.info("Shutting down Advanced K8s Dashboard API")


app = FastAPI(
    title="Advanced K8s Dashboard API",
    description="API for Kubernetes cluster monitoring with AI-powered insights",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8088"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper functions for generating scenario-based data
def get_base_timestamp() -> datetime:
    """Get base timestamp for data generation."""
    return datetime.now()

def generate_time_series(count: int, interval_minutes: int = 5, base_value: float = 50.0, variance: float = 10.0) -> List[Dict[str, Any]]:
    """Generate time series data points."""
    import random
    base_time = get_base_timestamp() - timedelta(minutes=count * interval_minutes)
    return [
        {
            "timestamp": (base_time + timedelta(minutes=i * interval_minutes)).isoformat(),
            "value": base_value + random.uniform(-variance, variance)
        }
        for i in range(count)
    ]


def _build_demo_overview_payload() -> Dict[str, Any]:
    """Build demo overview payload before AI augmentation."""
    global current_scenario

    overview = {
        "health_score": 92,
        "active_anomalies": 2,
        "recommendations": 5,
        "load_forecast_preview": 68,
        "cluster_metrics": {
            "cpu_usage": 58,
            "memory_usage": 72,
            "storage_usage": 45,
            "network_io": 34,
        },
        "nodes": [
            {"name": "node-1", "status": "Ready", "cpu": "45%", "memory": "62%", "pods": 24},
            {"name": "node-2", "status": "Ready", "cpu": "52%", "memory": "68%", "pods": 28},
            {"name": "node-3", "status": "Ready", "cpu": "38%", "memory": "55%", "pods": 19},
        ],
        "top_anomalies": [],
    }

    if current_scenario == "cpu_spike":
        overview["health_score"] = 65
        overview["active_anomalies"] = 1
        overview["cluster_metrics"]["cpu_usage"] = 95
        overview["nodes"][0]["cpu"] = "98%"
        overview["nodes"][0]["status"] = "Warning"
        overview["top_anomalies"] = [
            {
                "id": "anom-cpu-001",
                "type": "high_cpu",
                "namespace": "production",
                "pod": "web-server-abc123",
                "severity": "critical",
                "detected_at": (get_base_timestamp() - timedelta(minutes=5)).isoformat(),
                "status": "active",
                "baseline": 45.0,
                "current": 98.0,
            }
        ]
    elif current_scenario == "memory_leak":
        overview["health_score"] = 70
        overview["active_anomalies"] = 1
        overview["cluster_metrics"]["memory_usage"] = 88
        overview["nodes"][1]["memory"] = "92%"
        overview["nodes"][1]["status"] = "Warning"
        overview["top_anomalies"] = [
            {
                "id": "anom-mem-001",
                "type": "memory_leak",
                "namespace": "production",
                "pod": "api-backend-xyz789",
                "severity": "critical",
                "detected_at": (get_base_timestamp() - timedelta(minutes=15)).isoformat(),
                "status": "active",
                "baseline": 65.0,
                "current": 92.0,
            }
        ]
    elif current_scenario == "load_surge":
        overview["load_forecast_preview"] = 95
        overview["recommendations"] = 8
        overview["cluster_metrics"]["cpu_usage"] = 75
        overview["cluster_metrics"]["memory_usage"] = 82
    elif current_scenario == "high_reco":
        overview["recommendations"] = 12
        overview["health_score"] = 78

    return overview


def _build_history_payload(overview_payload: Dict[str, Any], points: int = 6) -> List[Dict[str, Any]]:
    """Build deterministic history payload for AI forecasting."""
    global current_scenario

    metrics = overview_payload.get("cluster_metrics", {})
    cpu_now = float(metrics.get("cpu_usage", 0.0))
    mem_now = float(metrics.get("memory_usage", 0.0))
    storage_now = float(metrics.get("storage_usage", 0.0))
    network_now = float(metrics.get("network_io", 0.0))

    if current_scenario in {"cpu_spike", "load_surge"}:
        cpu_step = 3.0
    elif current_scenario == "memory_leak":
        cpu_step = 1.0
    else:
        cpu_step = -0.8

    history: List[Dict[str, Any]] = []
    now = datetime.now()
    for i in range(points):
        offset = points - i
        cpu_value = max(0.0, min(100.0, cpu_now - (cpu_step * offset)))
        history.append(
            {
                "timestamp": (now - timedelta(minutes=5 * offset)).isoformat(),
                "cpu_usage": round(cpu_value, 2),
                "memory_usage": round(mem_now, 2),
                "storage_usage": round(storage_now, 2),
                "network_io": round(network_now, 2),
                "anomaly_count": int(overview_payload.get("active_anomalies", 0)),
            }
        )

    return history


def _ai_anomaly_to_api(anomaly: Dict[str, Any], index: int, metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Convert AI anomaly output into existing anomalies API shape."""
    cluster_metrics = metrics.get("cluster_metrics", {})
    current_cpu = float(cluster_metrics.get("cpu_usage", 0.0))
    return {
        "id": f"ai-anom-{index:03d}",
        "type": anomaly.get("type", "unknown"),
        "namespace": "production",
        "pod": "agent-orchestrator",
        "severity": anomaly.get("severity", "warning"),
        "detected_at": datetime.now().isoformat(),
        "status": "active",
        "baseline": max(0.0, round(current_cpu - 10.0, 2)),
        "current": round(current_cpu, 2),
        "reason": anomaly.get("explanation", "Detected by orchestration rules"),
        "confidence": anomaly.get("confidence", 0.8),
        "explanation": anomaly.get("explanation_detail"),
    }


def _ai_recommendation_to_api(rec: Dict[str, Any], index: int) -> Dict[str, Any]:
    """Convert AI recommendation output into existing recommendations API shape."""
    target = str(rec.get("target", "cluster/all"))
    namespace = "production"
    deployment = "api"
    if "/" in target:
        left, right = target.split("/", 1)
        if left == "namespace":
            namespace = right
            deployment = "cluster-wide"
        elif left == "deployment":
            deployment = right
        elif left == "cluster":
            namespace = "all"
            deployment = right

    return {
        "id": f"ai-rec-{index:03d}",
        "type": rec.get("type", "maintain_baseline"),
        "namespace": namespace,
        "deployment": deployment,
        "priority": rec.get("priority", "low"),
        "suggested_change": rec.get("impact", "No action required"),
        "reason": rec.get("reason", "Generated by AIOps agent"),
        "confidence": f"{int(round(float(rec.get('confidence', 0.8)) * 100))}%",
        "impact": rec.get("impact", "No impact"),
        "explanation": rec.get("explanation_detail"),
    }


def _paginate_items(items: List[Dict[str, Any]], limit: Optional[int], cursor: Optional[str]) -> tuple[List[Dict[str, Any]], Optional[str]]:
    """Apply optional cursor pagination without breaking legacy full-list behavior."""
    if limit is None:
        return items, None

    safe_limit = max(1, min(limit, 500))
    start = 0
    if cursor:
        try:
            start = max(0, int(cursor))
        except ValueError:
            start = 0

    page = items[start:start + safe_limit]
    next_cursor = str(start + safe_limit) if start + safe_limit < len(items) else None
    return page, next_cursor


def _log_audit_event(
    *,
    current_user: auth.User,
    action: str,
    target_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Best-effort audit logging; failures must not break API behavior."""
    try:
        AUDIT_STORE.append(
            AuditEvent(
                id="",
                ts=datetime.now().isoformat(),
                actor_email=current_user.email,
                actor_role=current_user.role,
                action=action,
                target_id=target_id,
                metadata=metadata or {},
            )
        )
    except Exception as exc:  # pragma: no cover - defensive only
        logger.warning("Audit log append failed: %s", exc)


# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/api/auth/login")
async def login_endpoint(login_data: auth.LoginRequest) -> auth.LoginResponse:
    """
    Authenticate user and receive JWT token.
    
    Args:
        login_data: Email and password
    
    Returns:
        JWT token with user info
    
    Example:
        POST /api/auth/login
        {
            "email": "admin@example.com",
            "password": "admin123"
        }
        
    Test Credentials:
        - admin@example.com / admin123 (role: admin)
        - ops@example.com / admin123 (role: operator)
        - viewer@example.com / admin123 (role: viewer)
    """
    return auth.login(login_data)


@app.get("/api/auth/me")
async def get_current_user_info(current_user: auth.User = Depends(auth.get_current_user)) -> Dict[str, Any]:
    """
    Get current authenticated user info.
    Requires: Valid JWT token in Authorization header
    
    Returns:
        User email and role
    """
    return {
        "email": current_user.email,
        "role": current_user.role
    }


# ==================== PUBLIC ENDPOINTS ====================

@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint (public - no auth required).
    
    Returns:
        Health status response
    """
    return {
        "status": "healthy",
        "provider": "kubernetes",
        "cluster": "k8s-openstack",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/overview")
async def get_overview(
    current_user: auth.User = Depends(auth.get_current_user)
) -> Dict[str, Any]:
    """
    Get cluster overview with KPIs and health metrics.
    Requires: Authentication (all roles)
    
    Returns:
        Overview data including health score, active anomalies, nodes, etc.
    """
    global active_data_mode, prometheus_adapter

    overview_payload: Dict[str, Any]

    if active_data_mode == "prometheus" and prometheus_adapter:
        try:
            logger.debug("Fetching overview from Prometheus")
            overview_payload = prometheus_adapter.get_overview()
        except PrometheusUnavailable as e:
            logger.warning(f"Prometheus query failed, falling back to demo: {e}")
            overview_payload = _build_demo_overview_payload()
    else:
        overview_payload = _build_demo_overview_payload()

    ai_result = run_ai_analysis(
        overview_payload,
        mode=active_data_mode,
        history_payload=_build_history_payload(overview_payload),
    )

    response = dict(overview_payload)
    response["health_score"] = ai_result["health_score"]
    response["active_anomalies"] = len(ai_result["anomalies"])
    response["recommendations"] = len(ai_result["recommendations"])
    response["load_forecast_preview"] = int(round(ai_result["forecast"]["predicted_peak"]))
    response["ai_meta"] = ai_result["ai_meta"]
    response["sla_risk"] = ai_result["sla_risk"]
    response["alerts_summary"] = ai_result["alerts_summary"]

    if not response.get("top_anomalies"):
        response["top_anomalies"] = [
            {
                "id": f"ai-top-{idx:03d}",
                "type": anomaly["type"],
                "severity": anomaly["severity"],
                "detected_at": datetime.now().isoformat(),
                "namespace": "production",
                "pod": "agent-orchestrator",
            }
            for idx, anomaly in enumerate(ai_result["anomalies"], start=1)
        ]

    return response


@app.get("/api/anomalies")
async def get_anomalies(
    window: str = "60m",
    limit: Optional[int] = None,
    cursor: Optional[str] = None,
    current_user: auth.User = Depends(auth.get_current_user)
) -> Dict[str, Any]:
    """
    Get detected anomalies within a time window.
    Requires: Authentication (all roles)
    
    Args:
        window: Time window (60m, 24h, 7d, 30d)
    
    Returns:
        List of anomalies with details
    """
    global current_scenario, active_data_mode, prometheus_adapter

    base_anomalies: List[Dict[str, Any]]
    metrics_payload: Dict[str, Any]

    if active_data_mode == "prometheus" and prometheus_adapter:
        try:
            logger.debug("Fetching anomalies from Prometheus")
            result = prometheus_adapter.get_anomalies(window)
            base_anomalies = result.get("anomalies", [])
            metrics_payload = prometheus_adapter.get_overview()
        except PrometheusUnavailable as e:
            logger.warning(f"Prometheus query failed, falling back to demo: {e}")
            metrics_payload = _build_demo_overview_payload()
            base_anomalies = []
    else:
        metrics_payload = _build_demo_overview_payload()
        base_anomalies = [
        {
            "id": "anom-001",
            "type": "high_latency",
            "namespace": "production",
            "pod": "frontend-web-abc123",
            "severity": "warning",
            "detected_at": (get_base_timestamp() - timedelta(hours=2)).isoformat(),
            "status": "active",
            "baseline": 120.0,
            "current": 280.0,
            "reason": "Response time exceeded baseline by 133%",
            "evidence": {
                "series": generate_time_series(12, interval_minutes=10, base_value=250, variance=30)
            }
        },
        {
            "id": "anom-002",
            "type": "pod_restart",
            "namespace": "staging",
            "pod": "cache-redis-def456",
            "severity": "warning",
            "detected_at": (get_base_timestamp() - timedelta(hours=4)).isoformat(),
            "status": "resolved",
            "baseline": 0.0,
            "current": 3.0,
            "reason": "Pod restarted 3 times in 1 hour"
        }
    ]

        if current_scenario == "cpu_spike":
            base_anomalies.insert(0, {
                "id": "anom-cpu-spike-001",
                "type": "high_cpu",
                "namespace": "production",
                "pod": "web-server-abc123",
                "node": "node-1",
                "severity": "critical",
                "detected_at": (get_base_timestamp() - timedelta(minutes=5)).isoformat(),
                "status": "active",
                "baseline": 45.0,
                "current": 98.0,
                "reason": "CPU usage reached 98%, exceeding baseline of 45%",
                "evidence": {
                    "series": generate_time_series(24, interval_minutes=1, base_value=85, variance=10)
                }
            })
        elif current_scenario == "memory_leak":
            base_anomalies.insert(0, {
                "id": "anom-mem-leak-001",
                "type": "memory_leak",
                "namespace": "production",
                "pod": "api-backend-xyz789",
                "node": "node-2",
                "severity": "critical",
                "detected_at": (get_base_timestamp() - timedelta(minutes=15)).isoformat(),
                "status": "active",
                "baseline": 65.0,
                "current": 92.0,
                "reason": "Progressive memory increase detected (27% above baseline)",
                "evidence": {
                    "series": generate_time_series(30, interval_minutes=2, base_value=80, variance=5)
                }
            })

    ai_result = run_ai_analysis(
        metrics_payload,
        mode=active_data_mode,
        history_payload=_build_history_payload(metrics_payload),
    )
    existing_types = {item.get("type") for item in base_anomalies}
    ai_anomalies = []
    for index, anomaly in enumerate(ai_result["anomalies"], start=1):
        if anomaly["type"] in existing_types:
            continue
        ai_anomalies.append(_ai_anomaly_to_api(anomaly, index, metrics_payload))

    merged_anomalies = ai_anomalies + base_anomalies
    page_anomalies, next_cursor = _paginate_items(merged_anomalies, limit, cursor)

    response: Dict[str, Any] = {
        "window": window,
        "anomalies": page_anomalies,
        "count": len(page_anomalies),
        "ai_meta": ai_result["ai_meta"],
        "sla_risk": ai_result["sla_risk"],
        "alerts_summary": ai_result["alerts_summary"],
    }
    if limit is not None:
        response["next_cursor"] = next_cursor

    return response


@app.get("/api/forecast")
async def get_forecast(
    horizon: str = "60m",
    current_user: auth.User = Depends(auth.get_current_user)
) -> Dict[str, Any]:
    """
    Get load forecast predictions.
    Requires: Authentication (all roles)
    
    Args:
        horizon: Forecast horizon (60m, 24h, 7d, 30d)
    
    Returns:
        Historical data and forecasted values with confidence intervals
    """
    global active_data_mode, prometheus_adapter

    overview_payload: Dict[str, Any]
    history_payload: List[Dict[str, Any]]
    response_history: List[Dict[str, Any]]

    if active_data_mode == "prometheus" and prometheus_adapter:
        try:
            logger.debug("Fetching forecast context from Prometheus")
            horizon_mapping = {"60m": "1h", "24h": "24h", "7d": "24h", "30d": "24h"}
            adapter_horizon = horizon_mapping.get(horizon, "1h")
            adapter_data = prometheus_adapter.get_forecast(adapter_horizon)
            response_history = adapter_data.get("history", [])
            overview_payload = prometheus_adapter.get_overview()
            history_payload = [
                {"timestamp": item.get("timestamp"), "value": item.get("value")}
                for item in response_history
            ]
        except PrometheusUnavailable as e:
            logger.warning(f"Prometheus query failed, falling back to demo: {e}")
            overview_payload = _build_demo_overview_payload()
            history_payload = _build_history_payload(overview_payload, points=12)
            response_history = [
                {"timestamp": point["timestamp"], "value": point["cpu_usage"]}
                for point in history_payload
            ]
    else:
        overview_payload = _build_demo_overview_payload()
        history_payload = _build_history_payload(overview_payload, points=12)
        response_history = [
            {"timestamp": point["timestamp"], "value": point["cpu_usage"]}
            for point in history_payload
        ]

    ai_result = run_ai_analysis(
        overview_payload,
        mode=active_data_mode,
        history_payload=history_payload,
    )

    return {
        "horizon": horizon,
        "model": "AIOpsLinearTrend",
        "history": response_history,
        "forecast": ai_result["forecast"]["forecast_series"],
        "predicted_peak": ai_result["forecast"]["predicted_peak"],
        "peak_time": ai_result["forecast"]["peak_time"],
        "trend": ai_result["forecast"]["trend"],
        "risk_level": ai_result["forecast"]["risk_level"],
        "confidence": ai_result["forecast"]["confidence"],
        "ai_meta": ai_result["ai_meta"],
        "sla_risk": ai_result["sla_risk"],
        "alerts_summary": ai_result["alerts_summary"],
    }


@app.get("/api/recommendations")
async def get_recommendations(
    namespace: Optional[str] = None,
    limit: Optional[int] = None,
    cursor: Optional[str] = None,
    current_user: auth.User = Depends(auth.get_current_user)
) -> Dict[str, Any]:
    """
    Get AI-generated optimization recommendations.
    Requires: Authentication (all roles)
    
    Args:
        namespace: Optional namespace filter
    
    Returns:
        List of recommendations with suggested actions
    """
    global current_scenario, active_data_mode, prometheus_adapter

    base_recommendations: List[Dict[str, Any]]
    metrics_payload: Dict[str, Any]

    if active_data_mode == "prometheus" and prometheus_adapter:
        try:
            logger.debug("Fetching recommendations from Prometheus")
            prom_result = prometheus_adapter.get_recommendations(namespace)
            base_recommendations = prom_result.get("recommendations", [])
            metrics_payload = prometheus_adapter.get_overview()
        except PrometheusUnavailable as e:
            logger.warning(f"Prometheus query failed, falling back to demo: {e}")
            base_recommendations = []
            metrics_payload = _build_demo_overview_payload()
    else:
        metrics_payload = _build_demo_overview_payload()
        base_recommendations = [
        {
            "id": "rec-001",
            "type": "resource_optimization",
            "namespace": "production",
            "pod": "frontend-web-abc123",
            "deployment": "frontend-web",
            "priority": "medium",
            "suggested_change": "Reduce CPU request from 500m to 300m",
            "reason": "Pod consistently uses <60% of requested CPU",
            "confidence": "85%"
        },
        {
            "id": "rec-002",
            "type": "scaling_recommendation",
            "namespace": "production",
            "deployment": "api-backend",
            "priority": "low",
            "suggested_change": "Consider HPA with min=2, max=5",
            "reason": "Regular traffic patterns show predictable load spikes",
            "confidence": "78%"
        },
        {
            "id": "rec-003",
            "type": "health_check",
            "namespace": "staging",
            "pod": "cache-redis-def456",
            "deployment": "cache-redis",
            "priority": "medium",
            "suggested_change": "Add liveness and readiness probes",
            "reason": "Pod restarts detected without proper health checks",
            "confidence": "92%"
        },
        {
            "id": "rec-004",
            "type": "memory_optimization",
            "namespace": "processing",
            "deployment": "worker-jobs",
            "priority": "low",
            "suggested_change": "Increase memory limit to 2Gi",
            "reason": "Worker pods approaching memory limits during peak processing",
            "confidence": "73%"
        },
        {
            "id": "rec-005",
            "type": "storage_optimization",
            "namespace": "logging",
            "deployment": "log-aggregator",
            "priority": "low",
            "suggested_change": "Implement log rotation policy",
            "reason": "Storage usage growing at 15GB/week",
            "confidence": "88%"
        }
    ]

        if current_scenario == "high_reco":
            base_recommendations.insert(0, {
                "id": "rec-critical-001",
                "type": "resource_optimization",
                "namespace": "production",
                "deployment": "api-backend",
                "priority": "critical",
                "suggested_change": "Increase replica count from 3 to 5",
                "reason": "Predicted load surge requires additional capacity",
                "confidence": "94%"
            })
            base_recommendations.insert(1, {
                "id": "rec-critical-002",
                "type": "scaling_recommendation",
                "namespace": "production",
                "deployment": "frontend-web",
                "priority": "critical",
                "suggested_change": "Enable autoscaling immediately (min=3, max=8)",
                "reason": "Current capacity insufficient for forecasted traffic",
                "confidence": "91%"
            })
            base_recommendations.insert(2, {
                "id": "rec-critical-003",
                "type": "performance",
                "namespace": "production",
                "deployment": "database-primary",
                "priority": "critical",
                "suggested_change": "Add read replicas to distribute query load",
                "reason": "Database connection pool nearing capacity",
                "confidence": "89%"
            })

    ai_result = run_ai_analysis(
        metrics_payload,
        mode=active_data_mode,
        history_payload=_build_history_payload(metrics_payload),
    )
    existing_types = {item.get("type") for item in base_recommendations}
    ai_recommendations = []
    for index, recommendation in enumerate(ai_result["recommendations"], start=1):
        if recommendation["type"] in existing_types:
            continue
        ai_recommendations.append(_ai_recommendation_to_api(recommendation, index))

    merged_recommendations = base_recommendations + ai_recommendations
    if namespace and namespace != "all":
        merged_recommendations = [item for item in merged_recommendations if item.get("namespace") == namespace]

    page_recommendations, next_cursor = _paginate_items(merged_recommendations, limit, cursor)

    response: Dict[str, Any] = {
        "recommendations": page_recommendations,
        "count": len(page_recommendations),
        "generated_at": datetime.now().isoformat(),
        "ai_meta": ai_result["ai_meta"],
        "sla_risk": ai_result["sla_risk"],
        "alerts_summary": ai_result["alerts_summary"],
    }
    if limit is not None:
        response["next_cursor"] = next_cursor

    return response


@app.get("/api/alerts")
async def get_alerts(
    status: Optional[str] = None,
    limit: Optional[int] = None,
    cursor: Optional[str] = None,
    current_user: auth.User = Depends(auth.get_current_user),
) -> AlertListResponse:
    """
    List alerts from alerting engine.
    Requires: Authentication (all roles)
    """
    allowed = {None, "active", "acknowledged", "resolved"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status filter")

    alerts = ALERT_STORE.list_alerts(status=status)
    alert_dicts = [alert.model_dump() for alert in alerts]
    page_alerts_dicts, next_cursor = _paginate_items(alert_dicts, limit, cursor)
    page_alerts = [Alert.model_validate(item) for item in page_alerts_dicts]
    return AlertListResponse(
        alerts=page_alerts,
        total=len(alerts),
        count=len(page_alerts),
        generated_at=datetime.now().isoformat(),
        next_cursor=next_cursor if limit is not None else None,
    )


@app.get("/api/audit")
async def get_audit_events(
    limit: int = 200,
    cursor: Optional[str] = None,
    current_user: auth.User = Depends(auth.get_current_user),
) -> AuditListResponse:
    """
    List audit events with role-aware visibility.
    - admin: all events
    - operator/viewer: own events only
    """
    events, next_cursor = AUDIT_STORE.list_events(current_user, limit=limit, cursor=cursor)
    return AuditListResponse(events=events, next_cursor=next_cursor)


@app.post("/api/alerts/{alert_id}/ack")
async def acknowledge_alert(
    alert_id: str,
    request: AckRequest,
    current_user: auth.User = Depends(auth.require_role(auth.WRITE_ROLES)),
) -> Alert:
    """
    Acknowledge an alert.
    Requires: Admin or Operator role
    """
    try:
        existing = ALERT_STORE.get_alert(alert_id)
        status_before = existing.status if existing else None
        updated = ALERT_STORE.acknowledge(alert_id, request.actor or current_user.email)
        _log_audit_event(
            current_user=current_user,
            action="alerts.ack",
            target_id=alert_id,
            metadata={
                "severity": updated.severity,
                "status_before": status_before,
                "status_after": updated.status,
            },
        )
        return updated
    except KeyError:
        raise HTTPException(status_code=404, detail="Alert not found") from None


@app.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    request: ResolveRequest,
    current_user: auth.User = Depends(auth.require_role(auth.WRITE_ROLES)),
) -> Alert:
    """
    Resolve an alert.
    Requires: Admin or Operator role
    """
    try:
        existing = ALERT_STORE.get_alert(alert_id)
        status_before = existing.status if existing else None
        updated = ALERT_STORE.resolve(alert_id, request.actor or current_user.email)
        _log_audit_event(
            current_user=current_user,
            action="alerts.resolve",
            target_id=alert_id,
            metadata={
                "severity": updated.severity,
                "status_before": status_before,
                "status_after": updated.status,
            },
        )
        return updated
    except KeyError:
        raise HTTPException(status_code=404, detail="Alert not found") from None


@app.post("/api/alerts/clear")
async def clear_alerts(
    current_user: auth.User = Depends(auth.require_role(auth.ADMIN_ONLY)),
) -> Dict[str, Any]:
    """
    Clear all alerts.
    Requires: Admin role
    """
    cleared = ALERT_STORE.clear_all()
    _log_audit_event(
        current_user=current_user,
        action="alerts.clear",
        metadata={"cleared": cleared},
    )
    return {"status": "success", "cleared": cleared}


@app.post("/api/recommendations/{recommendation_id}/apply")
async def apply_recommendation(
    recommendation_id: str,
    current_user: auth.User = Depends(auth.require_role(auth.WRITE_ROLES)),
) -> Dict[str, Any]:
    """Apply a recommendation (demo-safe in-memory action state)."""
    previous = recommendation_actions.get(recommendation_id, {})
    recommendation_actions[recommendation_id] = {
        "status": "applied",
        "updated_at": datetime.now().isoformat(),
        "actor": current_user.email,
    }
    _log_audit_event(
        current_user=current_user,
        action="reco.apply",
        target_id=recommendation_id,
        metadata={
            "status_after": "applied",
            "type": previous.get("type"),
            "priority": previous.get("priority"),
        },
    )
    return {
        "status": "success",
        "recommendation_id": recommendation_id,
        "action": "apply",
        "updated_at": recommendation_actions[recommendation_id]["updated_at"],
    }


@app.post("/api/recommendations/{recommendation_id}/dismiss")
async def dismiss_recommendation(
    recommendation_id: str,
    current_user: auth.User = Depends(auth.require_role(auth.WRITE_ROLES)),
) -> Dict[str, Any]:
    """Dismiss a recommendation (demo-safe in-memory action state)."""
    previous = recommendation_actions.get(recommendation_id, {})
    recommendation_actions[recommendation_id] = {
        "status": "dismissed",
        "updated_at": datetime.now().isoformat(),
        "actor": current_user.email,
    }
    _log_audit_event(
        current_user=current_user,
        action="reco.dismiss",
        target_id=recommendation_id,
        metadata={
            "status_after": "dismissed",
            "type": previous.get("type"),
            "priority": previous.get("priority"),
        },
    )
    return {
        "status": "success",
        "recommendation_id": recommendation_id,
        "action": "dismiss",
        "updated_at": recommendation_actions[recommendation_id]["updated_at"],
    }


@app.post("/api/recommendations/{recommendation_id}/snooze")
async def snooze_recommendation(
    recommendation_id: str,
    current_user: auth.User = Depends(auth.require_role(auth.WRITE_ROLES)),
) -> Dict[str, Any]:
    """Snooze a recommendation (demo-safe in-memory action state)."""
    previous = recommendation_actions.get(recommendation_id, {})
    recommendation_actions[recommendation_id] = {
        "status": "snoozed",
        "updated_at": datetime.now().isoformat(),
        "actor": current_user.email,
    }
    _log_audit_event(
        current_user=current_user,
        action="reco.snooze",
        target_id=recommendation_id,
        metadata={
            "status_after": "snoozed",
            "type": previous.get("type"),
            "priority": previous.get("priority"),
        },
    )
    return {
        "status": "success",
        "recommendation_id": recommendation_id,
        "action": "snooze",
        "updated_at": recommendation_actions[recommendation_id]["updated_at"],
    }


@app.post("/api/simulate/apply")
async def apply_scenario(
    request: ScenarioRequest,
    current_user: auth.User = Depends(auth.require_role(auth.WRITE_ROLES))
) -> Dict[str, Any]:
    """
    Apply a demo scenario to simulate different cluster conditions.
    Requires: Admin or Operator role
    Note: Only affects demo mode. In Prometheus mode, real metrics are used.
    
    Args:
        request: Scenario to apply (cpu_spike, memory_leak, load_surge, high_reco)
    
    Returns:
        Confirmation with scenario details
    """
    global current_scenario, scenario_applied_at, active_data_mode
    
    valid_scenarios = ["cpu_spike", "memory_leak", "load_surge", "high_reco"]
    
    if request.scenario not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario. Must be one of: {', '.join(valid_scenarios)}"
        )
    
    current_scenario = request.scenario
    scenario_applied_at = datetime.now().isoformat()
    
    # Message depends on mode
    if active_data_mode == "prometheus":
        message = f"Scenario '{current_scenario}' applied, but Prometheus mode is active - real metrics will be shown"
        logger.info(f"Demo scenario applied in Prometheus mode: {current_scenario} (no effect)")
    else:
        message = f"Scenario '{current_scenario}' applied successfully - demo data modified"
        logger.info(f"Applied demo scenario: {current_scenario}")
    
    return {
        "status": "success",
        "scenario": current_scenario,
        "message": message,
        "applied_at": scenario_applied_at
    }


@app.post("/api/simulate/reset")
async def reset_scenario(
    current_user: auth.User = Depends(auth.require_role(auth.WRITE_ROLES))
) -> Dict[str, Any]:
    """
    Reset to normal baseline (no active scenario).
    Requires: Admin or Operator role
    
    Returns:
        Confirmation of reset
    """
    global current_scenario, scenario_applied_at, active_data_mode
    
    current_scenario = None
    scenario_applied_at = datetime.now().isoformat()
    
    if active_data_mode == "prometheus":
        message = "Scenario reset (Prometheus mode active - showing real metrics)"
    else:
        message = "Scenario reset - demo data returned to normal"
    
    logger.info("Reset to normal baseline")
    
    return {
        "status": "success",
        "message": message
    }


@app.get("/api/mode")
async def get_mode(
    current_user: auth.User = Depends(auth.get_current_user)
) -> Dict[str, Any]:
    """
    Get current data mode and Prometheus status.
    Requires: Authentication (all roles)
    
    Returns:
        Mode information including active mode, Prometheus status, and current scenario
    """
    global active_data_mode, current_scenario, prometheus_client
    
    # Check Prometheus availability
    prometheus_up = False
    if prometheus_client:
        prometheus_up = prometheus_client.check_availability()
    
    return {
        "configured_mode": settings.DATA_MODE,
        "active_mode": active_data_mode,
        "prometheus_url": settings.PROMETHEUS_BASE_URL,
        "prometheus_up": prometheus_up,
        "current_scenario": current_scenario or "none"
    }


class ModeChangeRequest(BaseModel):
    mode: str


@app.post("/api/mode")
async def set_mode(
    request: ModeChangeRequest,
    current_user: auth.User = Depends(auth.require_role(auth.ADMIN_ONLY))
) -> Dict[str, Any]:
    """
    Change the active data mode (admin-only endpoint).
    Requires: Admin role
    
    Args:
        request: Mode to switch to (demo, prometheus, auto)
    
    Returns:
        Confirmation of mode change
    """
    global active_data_mode, prometheus_adapter, prometheus_client
    
    valid_modes = ["demo", "prometheus", "auto"]
    
    if request.mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode. Must be one of: {', '.join(valid_modes)}"
        )
    
    old_mode = active_data_mode
    
    # Switch mode
    if request.mode == "demo":
        active_data_mode = "demo"
        prometheus_adapter = None
        logger.info("Switched to DEMO mode")
    
    elif request.mode == "prometheus":
        if not prometheus_client:
            prometheus_client = PrometheusClient()
        
        if not prometheus_client.check_availability():
            raise HTTPException(
                status_code=503,
                detail="Prometheus is not available - cannot switch to Prometheus mode"
            )
        
        active_data_mode = "prometheus"
        prometheus_adapter = PrometheusAdapter(prometheus_client)
        logger.info("Switched to PROMETHEUS mode")
    
    elif request.mode == "auto":
        # Re-detect
        if prometheus_client and prometheus_client.check_availability():
            active_data_mode = "prometheus"
            prometheus_adapter = PrometheusAdapter(prometheus_client)
            logger.info("AUTO mode: Prometheus available - using PROMETHEUS mode")
        else:
            active_data_mode = "demo"
            prometheus_adapter = None
            logger.info("AUTO mode: Prometheus unavailable - using DEMO mode")

    _log_audit_event(
        current_user=current_user,
        action="mode.set",
        metadata={"mode_before": old_mode, "mode_after": active_data_mode},
    )
    
    return {
        "status": "success",
        "old_mode": old_mode,
        "new_mode": active_data_mode,
        "message": f"Data mode changed from {old_mode} to {active_data_mode}"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unexpected errors.
    
    Args:
        request: The request that caused the error
        exc: The exception that was raised
        
    Returns:
        JSON error response
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc)
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
