from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def _login(email: str, password: str = "admin123") -> str:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_health_endpoint_public_contract():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["status"] == "healthy"
    assert "cluster" in payload


def test_optional_pagination_contracts_for_lists():
    viewer = _login("viewer@example.com")
    headers = _auth_headers(viewer)

    alerts_resp = client.get("/api/alerts?limit=1", headers=headers)
    assert alerts_resp.status_code == 200
    alerts_payload = alerts_resp.json()
    assert "alerts" in alerts_payload
    assert "count" in alerts_payload
    assert "next_cursor" in alerts_payload

    anomalies_resp = client.get("/api/anomalies?window=60m&limit=1", headers=headers)
    assert anomalies_resp.status_code == 200
    anomalies_payload = anomalies_resp.json()
    assert "anomalies" in anomalies_payload
    assert "count" in anomalies_payload
    assert "next_cursor" in anomalies_payload

    reco_resp = client.get("/api/recommendations?limit=1", headers=headers)
    assert reco_resp.status_code == 200
    reco_payload = reco_resp.json()
    assert "recommendations" in reco_payload
    assert "count" in reco_payload
    assert "next_cursor" in reco_payload


def test_audit_logging_and_visibility_rules():
    admin = _login("admin@example.com")
    admin_headers = _auth_headers(admin)

    mode_resp = client.post("/api/mode", json={"mode": "demo"}, headers=admin_headers)
    assert mode_resp.status_code == 200

    audit_resp = client.get("/api/audit?limit=20", headers=admin_headers)
    assert audit_resp.status_code == 200
    audit_payload = audit_resp.json()
    assert "events" in audit_payload
    assert any(event["action"] == "mode.set" for event in audit_payload["events"])

    viewer = _login("viewer@example.com")
    viewer_headers = _auth_headers(viewer)
    viewer_audit = client.get("/api/audit?limit=20", headers=viewer_headers)
    assert viewer_audit.status_code == 200
    viewer_events = viewer_audit.json()["events"]
    assert all(event["actor_email"] == "viewer@example.com" for event in viewer_events)
