"""Stdio MCP server. Never calls an LLM or loads provider credentials."""

from typing import Literal

from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

from .analysis import analyze, export_graph as render_graph, find_path as shortest_path
from .models import Edge, GraphAnalysis, GraphResponse, Node, StoredGraph
from .store import GraphStore

mcp = FastMCP(
    "graph-analysis",
    instructions="Use your own reasoning to extract entities and relationships. Save the resulting graph with save_graph; no separate LLM API key is required.",
)
READ_ONLY = ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False)


@mcp.tool(annotations=READ_ONLY)
def list_graphs() -> list[dict]:
    """List saved graph IDs, titles, revisions, and node/edge counts."""
    return GraphStore().list()


@mcp.tool(annotations=READ_ONLY)
def get_graph(graph_id: str) -> StoredGraph:
    """Read a saved graph, including its revision for conflict-safe updates."""
    return GraphStore().get(graph_id)


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=False))
def save_graph(graph_id: str, nodes: list[Node], edges: list[Edge],
               title: str = "Untitled graph", expected_revision: int | None = None) -> StoredGraph:
    """Validate and save a complete graph. Use revision 0 for creation, or the last read revision for updates. Omitting expected_revision allows unconditional replacement."""
    return GraphStore().save(graph_id, GraphResponse(nodes=nodes, edges=edges), title,
                             expected_revision)


@mcp.tool(annotations=READ_ONLY)
def analyze_graph(graph_id: str) -> GraphAnalysis:
    """Compute directed graph degrees, cycles, isolated nodes, and weakly connected components."""
    return GraphAnalysis(**analyze(GraphStore().get(graph_id)))


@mcp.tool(annotations=READ_ONLY)
def find_path(graph_id: str, source: str, target: str) -> list[str]:
    """Find a shortest directed path between two node IDs; return [] if none exists."""
    return shortest_path(GraphStore().get(graph_id), source, target)


@mcp.tool(annotations=READ_ONLY)
def export_graph(graph_id: str, format: Literal["json", "mermaid"] = "json") -> str:
    """Export a saved graph as JSON or a Mermaid flowchart."""
    return render_graph(GraphStore().get(graph_id), format)


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
