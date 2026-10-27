"""The optional standalone LLM adapter is tested with a mock provider."""
import json
from unittest.mock import MagicMock, patch

import pytest

from graph_analysis.llm import LLMNotConfigured, LLMProviderError, generate_graph_from_text
from graph_analysis.models import GraphResponse, Node


@pytest.fixture
def provider(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-placeholder")
    monkeypatch.setenv("LLM_MODEL", "example-model")
    monkeypatch.delenv("GRAPH_ENV_FILE", raising=False)
    with patch("graph_analysis.llm.OpenAI") as factory:
        client = factory.return_value.__enter__.return_value
        response = MagicMock()
        response.choices[0].message.content = json.dumps({"nodes": [], "edges": []})
        client.chat.completions.create.return_value = response
        yield client.chat.completions.create


def test_default_graph_prompt(provider):
    generate_graph_from_text("Alice knows Bob")
    kwargs = provider.call_args.kwargs
    assert kwargs["model"] == "example-model"
    assert "JSON" in kwargs["messages"][0]["content"]


def test_custom_prompt_and_context(provider):
    graph = GraphResponse(nodes=[Node(id="alice", label="Alice")])
    generate_graph_from_text("Add Bob", current_graph=graph, include_current_graph=True,
                             model="another-model", system_prompt="Use the supplied graph")
    kwargs = provider.call_args.kwargs
    assert kwargs["model"] == "another-model"
    prompt = kwargs["messages"][0]["content"]
    assert prompt.startswith("Use the supplied graph")
    assert '"id":"alice"' in prompt


def test_invalid_provider_graph(provider):
    provider.return_value.choices[0].message.content = '{"nodes": [], "edges": [{"source":"a","target":"b","relation":"knows"}]}'
    with pytest.raises(LLMProviderError, match="invalid graph"):
        generate_graph_from_text("Alice knows Bob")


def test_missing_model(provider, monkeypatch):
    monkeypatch.delenv("LLM_MODEL")
    with pytest.raises(LLMNotConfigured, match="LLM_MODEL"):
        generate_graph_from_text("Alice knows Bob")
    provider.assert_not_called()
