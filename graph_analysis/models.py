from typing import Self

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator


class Node(BaseModel):
    id: str = Field(min_length=1, max_length=256)
    label: str = Field(min_length=1, max_length=4096)
    type: str = "default"
    properties: dict[str, JsonValue] = Field(default_factory=dict)


class Edge(BaseModel):
    source: str
    target: str
    relation: str = Field(min_length=1, max_length=4096)


class GraphResponse(BaseModel):
    """The common graph contract for the web app, CLI, and MCP server."""

    nodes: list[Node] = Field(default_factory=list, max_length=10000)
    edges: list[Edge] = Field(default_factory=list, max_length=50000)

    @model_validator(mode="after")
    def check_references(self) -> Self:
        ids = {node.id for node in self.nodes}
        if len(ids) != len(self.nodes):
            raise ValueError("Node IDs must be unique")
        for edge in self.edges:
            if edge.source not in ids or edge.target not in ids:
                raise ValueError("Every edge must reference existing node IDs")
        return self


class StoredGraph(GraphResponse):
    graph_id: str
    title: str
    revision: int
    updated_at: str


class GraphAnalysis(BaseModel):
    node_count: int
    edge_count: int
    directed: bool
    is_acyclic: bool
    isolated_nodes: list[str]
    weakly_connected_components: list[list[str]]
    degree: dict[str, dict[str, int]]


class SaveGraphRequest(GraphResponse):
    title: str = Field(default="Untitled graph", min_length=1, max_length=256)
    expected_revision: int | None = Field(default=None, ge=0)


class TextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=100000)
    system_prompt: str | None = None
    include_current_graph: bool = False
    current_graph: GraphResponse | None = None
    model: str | None = None
