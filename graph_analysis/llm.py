"""Optional standalone LLM adapter. The MCP server never imports this module."""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

from .models import GraphResponse

DEFAULT_PROMPT = """Extract a directed knowledge graph from the user's text. Return only a JSON object
with nodes (id, label, type, properties) and edges (source, target, relation).
Use stable unique node IDs; each edge endpoint must be an existing node ID.
Preserve explicitly provided facts and distinguish uncertainty in properties.
When a current graph is supplied, return the complete updated graph."""


class LLMNotConfigured(RuntimeError):
    pass


class LLMProviderError(RuntimeError):
    pass


def load_config() -> None:
    explicit = os.getenv("GRAPH_ENV_FILE")
    candidates = [Path(explicit).expanduser()] if explicit else [Path.cwd() / ".env", Path.cwd() / "backend/.env"]
    for path in candidates:
        if path.is_file():
            load_dotenv(path, override=False)
            break


def capabilities() -> dict:
    load_config()
    return {"llm_enabled": bool(os.getenv("OPENAI_API_KEY", "").strip()),
            "default_model": os.getenv("LLM_MODEL", "").strip() or None,
            "agent_tools_require_api_key": False}


def generate_graph_from_text(text: str, current_graph: GraphResponse | None = None,
                             model: str | None = None, system_prompt: str | None = None,
                             include_current_graph: bool = False) -> GraphResponse:
    load_config()
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise LLMNotConfigured("Standalone LLM is not configured. Use the agent tools or set your own OPENAI_API_KEY and LLM_MODEL.")
    selected_model = model or os.getenv("LLM_MODEL", "").strip()
    if not selected_model:
        raise LLMNotConfigured("Set LLM_MODEL or provide a model name for standalone generation.")
    prompt = system_prompt if system_prompt is not None else DEFAULT_PROMPT
    if include_current_graph and current_graph:
        prompt += f"\n\nCurrent Graph Data:\n{current_graph.model_dump_json()}"
    try:
        with OpenAI(api_key=api_key, base_url=os.getenv("LLM_BASE_URL") or None,
                    timeout=45.0, max_retries=0) as client:
            response = client.chat.completions.create(
                model=selected_model,
                messages=[{"role": "system", "content": prompt}, {"role": "user", "content": text}],
                response_format={"type": "json_object"}, temperature=0.0,
            )
        return GraphResponse.model_validate_json(response.choices[0].message.content or "")
    except OpenAIError as error:
        raise LLMProviderError("The LLM provider request failed. Check your provider, model, and credentials.") from error
    except ValueError as error:
        raise LLMProviderError("The LLM provider returned an invalid graph. Try a graph extraction prompt.") from error
