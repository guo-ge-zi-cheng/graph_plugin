import argparse
import json
import sys
from pathlib import Path

from .analysis import analyze, export_graph
from .models import GraphResponse
from .store import GraphStore


def main() -> None:
    parser = argparse.ArgumentParser(description="Graph analysis tools; no LLM API key needed")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("mcp", help="Start the stdio MCP server")
    serve = commands.add_parser("serve", help="Start the optional local web API")
    serve.add_argument("--port", type=int, default=8000)
    commands.add_parser("list", help="List saved graphs")
    validate = commands.add_parser("validate", help="Validate a graph JSON file (or - for stdin)")
    validate.add_argument("input")
    save = commands.add_parser("save", help="Validate and save a graph JSON file")
    save.add_argument("graph_id")
    save.add_argument("input")
    save.add_argument("--title", default="Untitled graph")
    save.add_argument("--expected-revision", type=int)
    for name in ("get", "analyze", "export"):
        sub = commands.add_parser(name)
        sub.add_argument("graph_id")
        if name == "export":
            sub.add_argument("--format", choices=["json", "mermaid"], default="json")
    args = parser.parse_args()
    try:
        if args.command == "mcp":
            from .mcp_server import main as run_mcp
            run_mcp()
            return
        if args.command == "serve":
            import uvicorn
            uvicorn.run("graph_analysis.web:app", host="127.0.0.1", port=args.port)
            return
        store = GraphStore()
        if args.command in {"validate", "save"}:
            content = sys.stdin.read() if args.input == "-" else Path(args.input).read_text(encoding="utf-8")
            graph = GraphResponse.model_validate_json(content)
            if args.command == "save":
                graph = store.save(args.graph_id, graph, args.title, args.expected_revision)
            result = graph.model_dump()
        elif args.command == "list":
            result = store.list()
        else:
            graph = store.get(args.graph_id)
            if args.command == "export":
                print(export_graph(graph, args.format))
                return
            result = analyze(graph) if args.command == "analyze" else graph.model_dump()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError) as error:
        parser.exit(1, f"Error: {error}\n")


if __name__ == "__main__":
    main()
