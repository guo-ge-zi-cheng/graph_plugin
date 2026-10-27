"""Smoke-check local graph APIs without contacting an LLM provider."""
import json
from pathlib import Path
from urllib.request import Request, urlopen

BASE_URL = "http://localhost:8000"

if __name__ == "__main__":
    for endpoint in ("health", "capabilities", "graphs"):
        with urlopen(f"{BASE_URL}/{endpoint}", timeout=10) as response:
            print(endpoint, json.load(response))
    graph = (Path(__file__).parent / "examples/team.json").read_bytes()
    request = Request(f"{BASE_URL}/validate-graph", data=graph, headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=10) as response:
        result = json.load(response)
        print("Example validated:", len(result["nodes"]), "nodes,", len(result["edges"]), "edges")
