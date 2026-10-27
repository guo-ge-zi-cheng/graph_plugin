---
name: graph-analysis
description: Build, edit, analyze, and export knowledge graphs from text, code, or supplied graph data. Use for entity relationships, dependency maps, directed paths, and graphs shared with the local editor.
---

# Graph Analysis

Use your current model to extract entities and relationships. The graph tools do not call another LLM and do not need provider keys.

## Build and update a graph

Read the supplied material. Keep supported entities and relationships; mark uncertain or inferred facts in node properties rather than presenting them as established facts. Choose stable IDs so later edits preserve identity.

Use the `graph-analysis` MCP tools when available (hosts may prefix tool names):

- `list_graphs` and `get_graph`: locate and read existing graphs.
- `save_graph`: submit the complete nodes and edges, a graph ID, title, and expected revision. Use `expected_revision: 0` for a new graph. For edits, read first and pass the returned revision. On a conflict, reload and reconcile the requested edit before retrying.
- `analyze_graph`: compute graph sizes, directed degrees, acyclicity, isolated nodes, and weakly connected components.
- `find_path`: find a shortest directed path; an empty result means no directed path exists.
- `export_graph`: return JSON or Mermaid for a saved graph.

Each node has `id`, `label`, optional `type` (default `default`), and optional JSON `properties`. Each edge has `source`, `target`, and `relation`. Node IDs must be unique and edge endpoints must exist. Graph IDs use letters, digits, underscores, and hyphens, starting with a letter or digit; maximum 128 characters.

```json
{
  "nodes": [
    {"id": "alice", "label": "Alice", "type": "person", "properties": {}},
    {"id": "acme", "label": "Acme", "type": "organization", "properties": {}}
  ],
  "edges": [{"source": "alice", "target": "acme", "relation": "works at"}]
}
```

## CLI fallback

If MCP is unavailable and `graph-analysis` is installed, write a graph JSON file and run:

```sh
graph-analysis validate graph.json
graph-analysis save my-graph graph.json --title "My graph" --expected-revision 0
graph-analysis get my-graph
graph-analysis analyze my-graph
graph-analysis export my-graph --format mermaid
```

If neither interface is installed, return valid graph JSON for import into the editor; do not claim it has been saved. With a repository checkout and `uv`, prefix CLI commands with `uv run --directory /absolute/path/to/checkout --locked`.

The CLI, MCP server, and web API share graphs only when they use the same `GRAPH_DATA_DIR` (otherwise all use the platform user's local share directory). In the web editor, open **Agent graphs**, refresh, then load the saved graph. Canvas edits reach the shared store only after **Save canvas**. Chat history and canvas snapshots also persist separately in that browser's IndexedDB.

Report the saved graph ID and revision, the relationship interpretation, and relevant analysis. Graph structure alone does not establish causation. Include a Mermaid view when it helps explain the result.
