from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from graph_analysis.llm import LLMProviderError
from graph_analysis.web import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("GRAPH_DATA_DIR", str(tmp_path / "graphs"))
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.delenv("GRAPH_ENV_FILE", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    return TestClient(app)


def test_no_key_mode(client):
    assert client.get("/health").json() == {"status": "ok"}
    status = client.get("/capabilities").json()
    assert status["llm_enabled"] is False
    assert status["agent_tools_require_api_key"] is False
    response = client.post("/generate-graph", json={"text": "Alice knows Bob"})
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]


def test_agent_and_web_share_store(client):
    response = client.put("/graphs/demo", json={
        "nodes": [{"id": "a", "label": "Alice", "type": "person", "properties": {"source": "example"}}],
        "edges": [], "title": "Demo", "expected_revision": 0,
    })
    assert response.status_code == 200
    assert client.get("/graphs/demo").json()["nodes"][0]["properties"] == {"source": "example"}
    assert client.get("/graphs").json()[0]["graph_id"] == "demo"
    stale = client.put("/graphs/demo", json={"nodes": [], "edges": [], "expected_revision": 0})
    assert stale.status_code == 409
    assert client.get("/graphs/missing").status_code == 404


def test_json_validation(client):
    response = client.post("/validate-graph", json={"nodes": [], "edges": [
        {"source": "missing", "target": "also-missing", "relation": "knows"},
    ]})
    assert response.status_code == 422


def test_provider_failure_is_actionable(client):
    with patch("graph_analysis.web.generate_graph_from_text", side_effect=LLMProviderError("Provider unavailable")):
        response = client.post("/generate-graph", json={"text": "Alice knows Bob"})
    assert response.status_code == 502
    assert response.json()["detail"] == "Provider unavailable"
