# Graph Analysis

Local knowledge graph tools for coding agents, with an interactive React editor and optional standalone LLM chat.

Your **Codex, Claude Code, or Antigravity agent supplies the intelligence**. The MCP server validates and stores the graph, computes graph metrics and directed paths, and exports JSON or Mermaid. **MCP, CLI, manual editing, and JSON import need no separate LLM API key.** People who want standalone chat can configure their own OpenAI-compatible provider.

This is an initial `0.1.0` implementation. It includes a portable plugin manifest, a Claude Code plugin wrapper, a reusable Agent Skill, a stdio MCP server, a Python CLI, and the web editor. It is not submitted to any public plugin directory or package registry.

## Quick start

Requirements: Python 3.11+, [uv](https://docs.astral.sh/uv/), and Node.js 22+ for the editor.

From this checkout:

```sh
uv sync --locked
uv run --locked graph-analysis validate examples/team.json
uv run --locked graph-analysis save demo examples/team.json --title "Example team" --expected-revision 0
uv run --locked graph-analysis analyze demo
uv run --locked graph-analysis export demo --format mermaid
```

Or install with `python -m pip install -e .` and use the `graph-analysis` command directly. No PyPI publication is required for local installation.

Graphs are stored in `$GRAPH_DATA_DIR`, defaulting to `$XDG_DATA_HOME/graph-analysis` or `~/.local/share/graph-analysis`. The CLI, MCP server, and web API must use the same directory and operating-system user to share graphs. Stored graphs may contain private source material: keep them outside version control. Browser chat history and canvas snapshots remain separately in IndexedDB.

## Connect a coding agent

### Codex CLI

Connect the stdio MCP server (replace the checkout path):

```sh
codex mcp add graph-analysis -- uv run --directory /absolute/path/to/graph_analysis_module --locked graph-analysis mcp
```

Copy `skills/graph-analysis/` into your chosen skill location: `.agents/skills/` in a target workspace, or `~/.agents/skills/` for personal use. Invoke `$graph-analysis`, or describe a matching task.

This repository also contains portable `plugin.json` and `mcp.json`, plus a repo marketplace in `.agents/plugins/marketplace.json`. Clients supporting Agent Plugins can load the whole package. For Codex marketplace discovery, run `codex plugin marketplace add /absolute/path/to/graph_analysis_module`, then install Graph Analysis from that source using your client's plugin interface. This is an alternative to separate MCP/skill setup; avoid configuring the same server twice.

### Claude Code

Load the complete plugin directly from the checkout:

```sh
claude --plugin-dir /absolute/path/to/graph_analysis_module
```

The `.claude-plugin/plugin.json` wrapper discovers `skills/` and `.mcp.json`; that MCP file resolves `${CLAUDE_PLUGIN_ROOT}` at runtime. Try `/graph-analysis:graph-analysis` to invoke the bundled skill. Restart the session after changing plugin files.

Alternatively, register only the server:

```sh
claude mcp add graph-analysis -- uv run --directory /absolute/path/to/graph_analysis_module --locked graph-analysis mcp
```

### Antigravity CLI

Copy `skills/graph-analysis/` into `<workspace>/.agents/skills/` or `~/.gemini/config/skills/`. Add this server entry to the existing `mcpServers` object in `<workspace>/.agents/mcp_config.json` or `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "graph-analysis": {
      "command": "uv",
      "args": ["run", "--directory", "/absolute/path/to/graph_analysis_module", "--locked", "graph-analysis", "mcp"]
    }
  }
}
```

Merge the entry with existing servers. Use `/mcp` to inspect or reload it. This integration uses the standard skill plus MCP configuration; there is no separate Antigravity-specific plugin wrapper.

## Agent workflow

Ask your agent: “Use graph-analysis to map Alice and Bob working at Acme, with Alice managing Bob. Save it as `team` and show a Mermaid view.”

The agent extracts the graph using its current model, then calls:

| Tool | Purpose |
| --- | --- |
| `list_graphs` | List graph IDs, titles, revisions, and sizes |
| `get_graph` | Read the complete saved graph |
| `save_graph` | Validate and save a complete graph |
| `analyze_graph` | Counts, directed degrees, cycles, isolated nodes, weak components |
| `find_path` | A shortest directed path between node IDs |
| `export_graph` | JSON or Mermaid output |

Use `expected_revision: 0` for creation. For updates, pass the revision returned by `get_graph`; a stale update is rejected. Omitting the revision explicitly allows unconditional replacement. Writes are locked and atomic across local processes.

Schema example: [examples/team.json](examples/team.json). Node `properties` accept JSON values, including source citations or uncertainty. Graphs are directed and support parallel relationships. There is no automatic inference or provider call inside MCP tools.

## Web editor

In one terminal, from the repository root:

```sh
uv run --locked --extra web graph-analysis serve
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Open [the editor](http://localhost:5173). The canvas opens first; **Standalone chat** shows the optional LLM panel. Select **Agent graphs**, refresh, and load a graph created by MCP or CLI. Make edits and press **Save canvas** to share the updated graph with your agent. The panel also imports validated JSON and exports the current canvas. It refreshes on request; it does not automatically overwrite your canvas when another process saves.

If saving reports a revision conflict, export your current canvas before reloading the newer graph, then reconcile the changes. Graph geometry and conversation history are browser-local; the shared store contains the node/edge graph data.

The API binds to loopback only and has no authentication. Keep it local. API docs: [localhost:8000/docs](http://localhost:8000/docs).

### Optional standalone LLM chat

Copy `backend/.env.example` to `backend/.env` and set **your own** values:

```dotenv
OPENAI_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=
```

Choose a model/provider supporting chat completions with JSON object output. `LLM_BASE_URL` is optional for the standard OpenAI endpoint. The editor's model field can override `LLM_MODEL` per request. Environment variables take precedence over dotenv files; restart the API after changing settings. To select an env file from another working directory, set `GRAPH_ENV_FILE=/absolute/path/to/.env`.

Without a key, standalone chat is disabled with an explanation; all local graph tools continue to work. Keys stay in server-side environment/configuration, and `.env` files are excluded from Git and plugin archives. No credentials are included in the repository.

## Development

```sh
uv sync --locked --extra web --extra dev
uv run --locked --extra web --extra dev pytest -q
cd frontend
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Tests cover graph invariants, concurrent writes and revision conflicts, storage path handling, graph analysis and exports, the optional LLM adapter with mocked providers, HTTP endpoints, and a real MCP stdio client/server round trip without an API key. Client manifests are validated separately; full interactive behavior in each agent host still depends on that host's installed version and configuration.

```text
graph_analysis/          Python models, storage, analysis, CLI, MCP, optional web/LLM
skills/graph-analysis/   Portable Agent Skill
plugin.json, mcp.json    Portable Agent Plugins package
.claude-plugin/          Claude Code plugin manifest
.mcp.json               Claude Code MCP launch configuration
.agents/plugins/        Local Codex marketplace catalog
frontend/               React, TypeScript, React Flow editor
backend/                Original entrypoint compatibility and env example
tests/                  Core, HTTP, CLI, and MCP tests
examples/               Non-sensitive sample graph
```

Packaging and client references: [OpenAI plugin format](https://developers.openai.com/plugins/build/plugins), [Claude Code plugins](https://code.claude.com/docs/en/plugins-reference), [Antigravity skills](https://antigravity.google/docs/skills), [Antigravity MCP](https://antigravity.google/docs/mcp).
