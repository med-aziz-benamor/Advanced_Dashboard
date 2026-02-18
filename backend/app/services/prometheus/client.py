"""
Prometheus HTTP client for querying metrics via PromQL.
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class PrometheusUnavailable(Exception):
    """Raised when Prometheus is not available or query fails."""
    pass


class PrometheusClient:
    """HTTP client for Prometheus API."""
    
    def __init__(self, base_url: Optional[str] = None, timeout: Optional[int] = None):
        """
        Initialize Prometheus client.
        
        Args:
            base_url: Prometheus server URL (default from settings)
            timeout: Query timeout in seconds (default from settings)
        """
        self.base_url = (base_url or settings.PROMETHEUS_BASE_URL).rstrip('/')
        self.timeout = timeout or settings.PROMETHEUS_TIMEOUT_SECONDS
        logger.info(f"Initialized PrometheusClient: {self.base_url} (timeout: {self.timeout}s)")
    
    def check_availability(self) -> bool:
        """
        Check if Prometheus is available.
        
        Returns:
            True if Prometheus is reachable, False otherwise
        """
        try:
            url = f"{self.base_url}/api/v1/status/runtimeinfo"
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url)
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"Prometheus availability check failed: {e}")
            return False
    
    def prom_query(self, query: str, ts: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Execute instant PromQL query.
        
        Args:
            query: PromQL query string
            ts: Optional timestamp (defaults to current time)
        
        Returns:
            Prometheus API response JSON
        
        Raises:
            PrometheusUnavailable: If query fails
        """
        try:
            params = {"query": query}
            if ts:
                params["time"] = ts.isoformat()
            
            url = f"{self.base_url}/api/v1/query"
            logger.debug(f"Prometheus query: {query}")
            
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") != "success":
                    raise PrometheusUnavailable(f"Query failed: {data.get('error', 'unknown error')}")
                
                return data
        
        except httpx.TimeoutException as e:
            logger.error(f"Prometheus query timeout: {e}")
            raise PrometheusUnavailable(f"Query timeout: {query}")
        except httpx.HTTPError as e:
            logger.error(f"Prometheus HTTP error: {e}")
            raise PrometheusUnavailable(f"HTTP error: {e}")
        except Exception as e:
            logger.error(f"Prometheus query failed: {e}")
            raise PrometheusUnavailable(f"Query failed: {e}")
    
    def prom_query_range(
        self, 
        query: str, 
        start: datetime, 
        end: datetime, 
        step_seconds: int = 60
    ) -> Dict[str, Any]:
        """
        Execute range PromQL query.
        
        Args:
            query: PromQL query string
            start: Start time
            end: End time
            step_seconds: Query resolution in seconds
        
        Returns:
            Prometheus API response JSON
        
        Raises:
            PrometheusUnavailable: If query fails
        """
        try:
            params = {
                "query": query,
                "start": start.isoformat(),
                "end": end.isoformat(),
                "step": f"{step_seconds}s"
            }
            
            url = f"{self.base_url}/api/v1/query_range"
            logger.debug(f"Prometheus range query: {query} ({start} to {end})")
            
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") != "success":
                    raise PrometheusUnavailable(f"Range query failed: {data.get('error', 'unknown error')}")
                
                return data
        
        except httpx.TimeoutException as e:
            logger.error(f"Prometheus range query timeout: {e}")
            raise PrometheusUnavailable(f"Range query timeout: {query}")
        except httpx.HTTPError as e:
            logger.error(f"Prometheus HTTP error: {e}")
            raise PrometheusUnavailable(f"HTTP error: {e}")
        except Exception as e:
            logger.error(f"Prometheus range query failed: {e}")
            raise PrometheusUnavailable(f"Range query failed: {e}")


# Helper parsers
def extract_instant_value(result_json: Dict[str, Any]) -> Optional[float]:
    """
    Extract single value from instant query result.
    
    Args:
        result_json: Prometheus query response
    
    Returns:
        Float value or None if no data
    """
    try:
        results = result_json.get("data", {}).get("result", [])
        if not results:
            return None
        
        # Get first result's value
        value = results[0].get("value", [None, None])
        if len(value) >= 2:
            return float(value[1])
        
        return None
    except (ValueError, TypeError, KeyError, IndexError) as e:
        logger.warning(f"Failed to extract instant value: {e}")
        return None


def extract_series(result_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract time series from range query result.
    
    Args:
        result_json: Prometheus range query response
    
    Returns:
        List of {timestamp: str, value: float} dicts
    """
    try:
        results = result_json.get("data", {}).get("result", [])
        if not results:
            return []
        
        # Take first metric's values
        values = results[0].get("values", [])
        
        series = []
        for ts, val in values:
            try:
                # Convert Unix timestamp to ISO string
                dt = datetime.fromtimestamp(float(ts))
                series.append({
                    "timestamp": dt.isoformat(),
                    "value": float(val)
                })
            except (ValueError, TypeError):
                continue
        
        return series
    
    except (KeyError, IndexError) as e:
        logger.warning(f"Failed to extract series: {e}")
        return []


def extract_all_series(result_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract all time series from range query (for multi-metric queries).
    
    Args:
        result_json: Prometheus range query response
    
    Returns:
        List of series, each with metric labels and values
    """
    try:
        results = result_json.get("data", {}).get("result", [])
        all_series = []
        
        for result in results:
            metric = result.get("metric", {})
            values = result.get("values", [])
            
            series_data = []
            for ts, val in values:
                try:
                    dt = datetime.fromtimestamp(float(ts))
                    series_data.append({
                        "timestamp": dt.isoformat(),
                        "value": float(val)
                    })
                except (ValueError, TypeError):
                    continue
            
            all_series.append({
                "metric": metric,
                "values": series_data
            })
        
        return all_series
    
    except (KeyError, IndexError) as e:
        logger.warning(f"Failed to extract all series: {e}")
        return []


def extract_labeled_values(result_json: Dict[str, Any], label_key: str) -> Dict[str, float]:
    """
    Extract instant values grouped by a label (e.g., node names).
    
    Args:
        result_json: Prometheus query response
        label_key: Label to use as key (e.g., "node", "instance")
    
    Returns:
        Dict mapping label values to metric values
    """
    try:
        results = result_json.get("data", {}).get("result", [])
        labeled_values = {}
        
        for result in results:
            metric = result.get("metric", {})
            label_value = metric.get(label_key)
            
            if label_value:
                value = result.get("value", [None, None])
                if len(value) >= 2:
                    try:
                        labeled_values[label_value] = float(value[1])
                    except (ValueError, TypeError):
                        continue
        
        return labeled_values
    
    except (KeyError, IndexError) as e:
        logger.warning(f"Failed to extract labeled values: {e}")
        return {}
