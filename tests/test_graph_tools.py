import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from pydantic import ValidationError

from graph_analysis.analysis import analyze, export_graph, find_path
from graph_analysis.models import GraphResponse
from graph_analysis.store import GraphStore, RevisionConflict

EXAMPLE = Path(__file__).resolve().parents[1] / "examples/team.json"


@pytest.fixture
def graph():
    return GraphResponse.model_validate_json(EXAMPLE.read_text())


def test_reject_duplicate_ids_and_dangling_edges():
    with pytest.raises(ValidationError, match="unique"):
        GraphResponse(nodes=[{"id": "a", "label": "A"}, {"id": "a", "label": "Again"}])
    with pytest.raises(ValidationError, match="existing"):
        GraphResponse(nodes=[], edges=[{"source": "a", "target": "b", "relation": "knows"}])


def test_analysis_and_directed_paths(graph):
    result = analyze(graph)
    assert (result["node_count"], result["edge_count"]) == (3, 3)
    assert result["is_acyclic"]
    assert result["weakly_connected_components"] == [["acme", "alice", "bob"]]
    assert result["degree"]["alice"] == {"in": 0, "out": 2}
    assert find_path(graph, "alice", "bob") == ["alice", "bob"]
    assert find_path(graph, "bob", "alice") == []


def test_cycles_isolates_and_parallel_relations():
    graph = GraphResponse(nodes=[{"id": id, "label": id} for id in ("a", "b", "c")], edges=[
        {"source": "a", "target": "b", "relation": "knows"},
        {"source": "a", "target": "b", "relation": "manages"},
        {"source": "b", "target": "a", "relation": "knows"},
    ])
    result = analyze(graph)
    assert not result["is_acyclic"]
    assert result["isolated_nodes"] == ["c"]
    assert result["degree"]["a"]["out"] == 2
    assert result["edge_count"] == 3


def test_empty_graph():
    assert analyze(GraphResponse())["weakly_connected_components"] == []


def test_save_read_and_conflict(tmp_path, graph):
    store = GraphStore(tmp_path)
    first = store.save("team", graph, "Team", expected_revision=0)
    assert first.revision == 1
    assert store.get("team") == first
    assert store.list()[0]["node_count"] == 3
    with pytest.raises(RevisionConflict):
        store.save("team", GraphResponse(), expected_revision=0)
    assert store.get("team").nodes == first.nodes
    assert store.save("team", graph, expected_revision=1).revision == 2


def test_concurrent_updates_do_not_silently_overwrite(tmp_path, graph):
    store = GraphStore(tmp_path)
    store.save("team", graph, expected_revision=0)

    def save_once(_):
        try:
            return store.save("team", graph, expected_revision=1).revision
        except RevisionConflict:
            return "conflict"

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(save_once, range(2)))
    assert sorted(map(str, results)) == ["2", "conflict"]


@pytest.mark.parametrize("graph_id", ["../private", "/tmp/secret", ".env", "foo/bar", "", "a" * 129])
def test_invalid_storage_paths(tmp_path, graph, graph_id):
    with pytest.raises(ValueError):
        GraphStore(tmp_path).save(graph_id, graph)


def test_reject_symlink(tmp_path, graph):
    external = tmp_path / "external"
    external.write_text("untouched")
    (tmp_path / "team.json").symlink_to(external)
    with pytest.raises(ValueError):
        GraphStore(tmp_path).save("team", graph)
    assert external.read_text() == "untouched"


def test_exports_preserve_graph_and_escape_labels(graph):
    assert GraphResponse.model_validate_json(export_graph(graph)) == graph
    graph.nodes[0].label = 'Alice"]\n<script>alert(1)</script>'
    mermaid = export_graph(graph, "mermaid")
    assert '<script>' not in mermaid
    assert '#quot;' in mermaid
    assert '\n<script>' not in mermaid
    assert 'n0 -->|"manages"| n1' in mermaid


def test_cli_roundtrip_without_key(tmp_path):
    env = {**os.environ, "GRAPH_DATA_DIR": str(tmp_path), "OPENAI_API_KEY": ""}
    def run(*args):
        return subprocess.run([sys.executable, "-m", "graph_analysis.cli", *args],
                              env=env, capture_output=True, text=True, check=True)
    saved = json.loads(run("save", "team", str(EXAMPLE), "--expected-revision", "0").stdout)
    assert saved["revision"] == 1
    assert json.loads(run("analyze", "team").stdout)["node_count"] == 3
    assert run("export", "team", "--format", "mermaid").stdout.startswith("flowchart LR")
