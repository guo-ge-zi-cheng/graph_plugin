import json

import networkx as nx

from .models import GraphResponse


def as_network(graph: GraphResponse) -> nx.MultiDiGraph:
    result = nx.MultiDiGraph()
    result.add_nodes_from(node.id for node in graph.nodes)
    result.add_edges_from((edge.source, edge.target) for edge in graph.edges)
    return result


def analyze(graph: GraphResponse) -> dict:
    network = as_network(graph)
    return {
        "node_count": len(graph.nodes),
        "edge_count": len(graph.edges),
        "directed": True,
        "is_acyclic": nx.is_directed_acyclic_graph(network),
        "isolated_nodes": sorted(nx.isolates(network)),
        "weakly_connected_components": sorted(
            [sorted(component) for component in nx.weakly_connected_components(network)]
        ),
        "degree": {node.id: {"in": network.in_degree(node.id), "out": network.out_degree(node.id)}
                   for node in graph.nodes},
    }


def find_path(graph: GraphResponse, source: str, target: str) -> list[str]:
    network = as_network(graph)
    if source not in network or target not in network:
        raise ValueError("Source and target must be existing node IDs")
    try:
        return nx.shortest_path(network, source, target)
    except nx.NetworkXNoPath:
        return []


def export_graph(graph: GraphResponse, format: str = "json") -> str:
    if format == "json":
        return json.dumps(graph.model_dump(include={"nodes", "edges"}), ensure_ascii=False, indent=2)
    if format != "mermaid":
        raise ValueError("Format must be json or mermaid")

    def label(value: str) -> str:
        # Entity escapes keep arbitrary labels from becoming Mermaid syntax or HTML.
        for char, escaped in (("&", "#38;"), ("\\", "#92;"), ('"', "#quot;"),
                              ("<", "#60;"), (">", "#62;"), ("`", "#96;")):
            value = value.replace(char, escaped)
        return " ".join(value.splitlines())

    names = {node.id: f"n{index}" for index, node in enumerate(graph.nodes)}
    lines = ["flowchart LR"]
    lines.extend(f'  {names[node.id]}["{label(node.label)}"]' for node in graph.nodes)
    lines.extend(f'  {names[edge.source]} -->|"{label(edge.relation)}"| {names[edge.target]}'
                 for edge in graph.edges)
    return "\n".join(lines)
