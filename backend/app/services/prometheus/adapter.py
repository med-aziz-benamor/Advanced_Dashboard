"""
Prometheus Adapter: Maps Prometheus metrics to API response formats.
"""
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from backend.app.services.prometheus.client import (
    PrometheusClient,
    PrometheusUnavailable,
    extract_instant_value,
    extract_series,
    extract_labeled_values,
)

logger = logging.getLogger(__name__)


class PrometheusAdapter:
    """Adapter to fetch and map Prometheus metrics to API responses."""
    
    def __init__(self, client: PrometheusClient):
        """Initialize adapter with Prometheus client."""
        self.client = client
    
    def get_overview(self) -> Dict[str, Any]:
        """
        Fetch overview metrics from Prometheus.
        
        Returns:
            Overview response dict matching API contract
        """
        try:
            # Fetch cluster-level metrics
            cpu_usage = self._get_cluster_cpu_usage()
            memory_usage = self._get_cluster_memory_usage()
            storage_usage = self._get_cluster_storage_usage()
            network_io = self._get_cluster_network_io()
            
            # Fetch node information
            nodes = self._get_nodes_info()
            
            # Count active anomalies (from alerts)
            active_anomalies = self._count_firing_alerts()
            
            # Calculate health score
            health_score = self._calculate_health_score(
                cpu_usage, memory_usage, active_anomalies
            )
            
            # Heuristic: recommendations if resources are high
            recommendations_count = 0
            if cpu_usage > 80 or memory_usage > 80:
                recommendations_count = 3
            elif cpu_usage > 60 or memory_usage > 60:
                recommendations_count = 5
            else:
                recommendations_count = 2
            
            return {
                "health_score": health_score,
                "active_anomalies": active_anomalies,
                "recommendations": recommendations_count,
                "load_forecast_preview": int(cpu_usage),  # Simple heuristic
                "cluster_metrics": {
                    "cpu_usage": round(cpu_usage, 1),
                    "memory_usage": round(memory_usage, 1),
                    "storage_usage": round(storage_usage, 1),
                    "network_io": round(network_io, 1)
                },
                "nodes": nodes,
                "top_anomalies": []  # Could be populated from alerts
            }
        
        except PrometheusUnavailable as e:
            logger.error(f"Prometheus unavailable for overview: {e}")
            raise
    
    def get_anomalies(self, window: str = "60m") -> Dict[str, Any]:
        """
        Fetch anomalies from Prometheus alerts.
        
        Args:
            window: Time window (not used in Prometheus mode)
        
        Returns:
            Anomalies response dict
        """
        try:
            anomalies = []
            
            # Query firing alerts
            query = 'ALERTS{alertstate="firing"}'
            result = self.client.prom_query(query)
            
            results = result.get("data", {}).get("result", [])
            
            for alert in results:
                metric = alert.get("metric", {})
                alertname = metric.get("alertname", "unknown")
                
                # Generate unique ID
                labels_str = str(sorted(metric.items()))
                alert_id = hashlib.md5(labels_str.encode()).hexdigest()[:12]
                
                # Extract metadata
                namespace = metric.get("namespace", "default")
                pod = metric.get("pod", metric.get("pod_name", "unknown"))
                severity = metric.get("severity", "warning")
                
                anomalies.append({
                    "id": f"prom-{alert_id}",
                    "type": alertname.lower().replace(" ", "_"),
                    "namespace": namespace,
                    "pod": pod,
                    "severity": severity,
                    "detected_at": datetime.now().isoformat(),
                    "status": "active",
                    "baseline": 0.0,
                    "current": 100.0,
                    "reason": metric.get("summary", f"Alert: {alertname}")
                })
            
            return {
                "anomalies": anomalies,
                "total": len(anomalies)
            }
        
        except PrometheusUnavailable as e:
            logger.error(f"Prometheus unavailable for anomalies: {e}")
            raise
    
    def get_forecast(self, horizon: str = "1h") -> Dict[str, Any]:
        """
        Generate forecast from Prometheus historical data.
        
        Args:
            horizon: Forecast horizon (1h, 6h, 24h)
        
        Returns:
            Forecast response dict with history and predictions
        """
        try:
            # Parse horizon to determine time range
            if horizon == "1h":
                history_duration = timedelta(hours=1)
                forecast_duration = timedelta(hours=1)
                step_seconds = 300  # 5 minutes
            elif horizon == "6h":
                history_duration = timedelta(hours=6)
                forecast_duration = timedelta(hours=6)
                step_seconds = 1800  # 30 minutes
            else:  # 24h
                history_duration = timedelta(hours=24)
                forecast_duration = timedelta(hours=24)
                step_seconds = 3600  # 1 hour
            
            # Fetch historical CPU usage
            end_time = datetime.now()
            start_time = end_time - history_duration
            
            query = '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))'
            result = self.client.prom_query_range(query, start_time, end_time, step_seconds)
            
            history_series = extract_series(result)
            
            # Simple linear extrapolation for forecast
            forecast_series = self._generate_forecast(
                history_series, 
                forecast_duration, 
                step_seconds
            )
            
            return {
                "horizon": horizon,
                "model": "PrometheusLinear",
                "history": history_series,
                "forecast": forecast_series
            }
        
        except PrometheusUnavailable as e:
            logger.error(f"Prometheus unavailable for forecast: {e}")
            raise
    
    def get_recommendations(self, namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate recommendations based on Prometheus metrics.
        
        Args:
            namespace: Optional namespace filter
        
        Returns:
            Recommendations response dict
        """
        try:
            recommendations = []
            
            # Fetch current metrics
            cpu_usage = self._get_cluster_cpu_usage()
            memory_usage = self._get_cluster_memory_usage()
            storage_usage = self._get_cluster_storage_usage()
            
            # Generate recommendations based on thresholds
            if cpu_usage > 80:
                recommendations.append({
                    "id": "prom-rec-cpu-001",
                    "type": "resource_optimization",
                    "namespace": namespace or "production",
                    "deployment": "high-cpu-workload",
                    "priority": "high",
                    "suggested_change": "Consider enabling HPA or increasing CPU limits",
                    "reason": f"Cluster CPU usage at {cpu_usage:.1f}% - above 80% threshold",
                    "confidence": "85%"
                })
            
            if memory_usage > 80:
                recommendations.append({
                    "id": "prom-rec-mem-001",
                    "type": "memory_optimization",
                    "namespace": namespace or "production",
                    "deployment": "high-memory-workload",
                    "priority": "high",
                    "suggested_change": "Increase memory requests or investigate memory leaks",
                    "reason": f"Cluster memory usage at {memory_usage:.1f}% - above 80% threshold",
                    "confidence": "88%"
                })
            
            if storage_usage > 80:
                recommendations.append({
                    "id": "prom-rec-storage-001",
                    "type": "storage_optimization",
                    "namespace": namespace or "all",
                    "deployment": "storage-intensive-apps",
                    "priority": "medium",
                    "suggested_change": "Expand PVC size or enable log rotation",
                    "reason": f"Storage usage at {storage_usage:.1f}% - approaching capacity",
                    "confidence": "90%"
                })
            
            # Add general recommendations
            if len(recommendations) == 0:
                recommendations.append({
                    "id": "prom-rec-general-001",
                    "type": "monitoring",
                    "namespace": namespace or "all",
                    "deployment": "cluster-wide",
                    "priority": "low",
                    "suggested_change": "Enable additional monitoring dashboards",
                    "reason": "Cluster metrics are healthy - proactive monitoring recommended",
                    "confidence": "75%"
                })
            
            return {
                "recommendations": recommendations,
                "total": len(recommendations),
                "generated_at": datetime.now().isoformat()
            }
        
        except PrometheusUnavailable as e:
            logger.error(f"Prometheus unavailable for recommendations: {e}")
            raise
    
    # Internal helper methods
    
    def _get_cluster_cpu_usage(self) -> float:
        """Get cluster-wide CPU usage percentage."""
        try:
            query = '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))'
            result = self.client.prom_query(query)
            value = extract_instant_value(result)
            return value if value is not None else 50.0
        except PrometheusUnavailable:
            return 50.0
    
    def _get_cluster_memory_usage(self) -> float:
        """Get cluster-wide memory usage percentage."""
        try:
            query = '100 * (1 - avg(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))'
            result = self.client.prom_query(query)
            value = extract_instant_value(result)
            return value if value is not None else 60.0
        except PrometheusUnavailable:
            return 60.0
    
    def _get_cluster_storage_usage(self) -> float:
        """Get cluster-wide storage usage percentage."""
        try:
            query = '100 * (1 - avg(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}))'
            result = self.client.prom_query(query)
            value = extract_instant_value(result)
            return value if value is not None else 45.0
        except PrometheusUnavailable:
            return 45.0
    
    def _get_cluster_network_io(self) -> float:
        """Get cluster network I/O in MB/s."""
        try:
            query = 'sum(rate(node_network_receive_bytes_total[5m]) + rate(node_network_transmit_bytes_total[5m])) / 1024 / 1024'
            result = self.client.prom_query(query)
            value = extract_instant_value(result)
            return value if value is not None else 30.0
        except PrometheusUnavailable:
            return 30.0
    
    def _count_firing_alerts(self) -> int:
        """Count firing alerts as active anomalies."""
        try:
            query = 'count(ALERTS{alertstate="firing"})'
            result = self.client.prom_query(query)
            value = extract_instant_value(result)
            return int(value) if value is not None else 0
        except PrometheusUnavailable:
            return 0
    
    def _calculate_health_score(self, cpu: float, memory: float, anomalies: int) -> int:
        """Calculate health score 0-100 based on metrics."""
        score = 100
        
        # Penalize high CPU
        if cpu > 80:
            score -= 20
        elif cpu > 60:
            score -= 10
        
        # Penalize high memory
        if memory > 80:
            score -= 20
        elif memory > 60:
            score -= 10
        
        # Penalize anomalies
        score -= min(anomalies * 5, 30)
        
        return max(0, min(100, score))
    
    def _get_nodes_info(self) -> List[Dict[str, Any]]:
        """Get node information from Prometheus."""
        try:
            # Try to get node list from kube_node_info
            query = 'kube_node_info'
            result = self.client.prom_query(query)
            
            results = result.get("data", {}).get("result", [])
            
            if not results:
                # Fallback: return empty list
                logger.warning("No kube_node_info metric found")
                return []
            
            nodes = []
            for node_result in results:
                metric = node_result.get("metric", {})
                node_name = metric.get("node", metric.get("instance", "unknown"))
                
                # Get CPU usage for this node
                cpu_query = f'100 * (1 - avg by(instance) (rate(node_cpu_seconds_total{{instance=~".*{node_name}.*",mode="idle"}}[5m])))'
                try:
                    cpu_result = self.client.prom_query(cpu_query)
                    cpu_value = extract_instant_value(cpu_result)
                    cpu_percent = cpu_value if cpu_value is not None else 50.0
                except:
                    cpu_percent = 50.0
                
                # Get memory usage for this node
                mem_query = f'100 * (1 - (node_memory_MemAvailable_bytes{{instance=~".*{node_name}.*"}} / node_memory_MemTotal_bytes{{instance=~".*{node_name}.*"}}))'
                try:
                    mem_result = self.client.prom_query(mem_query)
                    mem_value = extract_instant_value(mem_result)
                    mem_percent = mem_value if mem_value is not None else 60.0
                except:
                    mem_percent = 60.0
                
                # Get pod count
                pod_query = f'count(kube_pod_info{{node="{node_name}"}})'
                try:
                    pod_result = self.client.prom_query(pod_query)
                    pod_count = extract_instant_value(pod_result)
                    pods = int(pod_count) if pod_count is not None else 0
                except:
                    pods = 0
                
                # Determine status
                status = "Ready" if cpu_percent < 90 and mem_percent < 90 else "Warning"
                
                nodes.append({
                    "name": node_name,
                    "status": status,
                    "cpu": f"{cpu_percent:.0f}%",
                    "memory": f"{mem_percent:.0f}%",
                    "pods": pods
                })
            
            return nodes[:10]  # Limit to 10 nodes
        
        except PrometheusUnavailable:
            logger.warning("Could not fetch node info from Prometheus")
            return []
    
    def _generate_forecast(
        self, 
        history: List[Dict[str, Any]], 
        duration: timedelta, 
        step_seconds: int
    ) -> List[Dict[str, Any]]:
        """
        Generate simple linear forecast from history.
        
        Args:
            history: Historical data points
            duration: Forecast duration
            step_seconds: Step size in seconds
        
        Returns:
            List of forecast points with confidence bounds
        """
        if not history or len(history) < 2:
            # No data for forecast
            return []
        
        # Take last 10 points for trend calculation
        recent = history[-10:]
        values = [p["value"] for p in recent]
        
        # Simple linear regression: calculate slope
        n = len(values)
        x_vals = list(range(n))
        x_mean = sum(x_vals) / n
        y_mean = sum(values) / n
        
        numerator = sum((x_vals[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x - x_mean) ** 2 for x in x_vals)
        
        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean
        
        # Generate forecast points
        forecast = []
        steps = int(duration.total_seconds() / step_seconds)
        last_timestamp = datetime.fromisoformat(history[-1]["timestamp"])
        
        for i in range(1, steps + 1):
            timestamp = last_timestamp + timedelta(seconds=i * step_seconds)
            predicted = intercept + slope * (n + i)
            
            # Apply bounds
            lower_bound = max(0, predicted - 5)
            upper_bound = min(100, predicted + 5)
            predicted = max(0, min(100, predicted))
            
            forecast.append({
                "timestamp": timestamp.isoformat(),
                "value": round(predicted, 2),
                "lower_bound": round(lower_bound, 2),
                "upper_bound": round(upper_bound, 2)
            })
        
        return forecast
