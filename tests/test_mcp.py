import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def test_real_mcp_stdio_session_without_key(tmp_path):
    async def scenario():
        params = StdioServerParameters(
            command=sys.executable, args=["-m", "graph_analysis.mcp_server"],
            env={**os.environ, "GRAPH_DATA_DIR": str(tmp_path), "OPENAI_API_KEY": ""},
        )
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await session.list_tools()
                assert {tool.name for tool in tools.tools} == {
                    "list_graphs", "get_graph", "save_graph", "analyze_graph", "find_path", "export_graph",
                }
                graph = json.loads((Path(__file__).parents[1] / "examples/team.json").read_text())
                saved = await session.call_tool("save_graph", {"graph_id": "team", **graph, "expected_revision": 0})
                assert not saved.isError
                assert saved.structuredContent["revision"] == 1
                readback = await session.call_tool("get_graph", {"graph_id": "team"})
                assert len(readback.structuredContent["nodes"]) == 3
                stats = await session.call_tool("analyze_graph", {"graph_id": "team"})
                assert stats.structuredContent["node_count"] == 3
                exported = await session.call_tool("export_graph", {"graph_id": "team", "format": "mermaid"})
                assert "flowchart LR" in exported.content[0].text
                stale = await session.call_tool("save_graph", {"graph_id": "team", **graph, "expected_revision": 0})
                assert stale.isError
                invalid = await session.call_tool("save_graph", {"graph_id": "../escape", **graph})
                assert invalid.isError
    asyncio.run(scenario())
