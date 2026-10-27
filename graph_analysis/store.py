import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from filelock import FileLock

from .models import GraphResponse, StoredGraph


class RevisionConflict(ValueError):
    pass


class GraphStore:
    def __init__(self, directory: str | Path | None = None):
        default = Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local/share")) / "graph-analysis"
        self.directory = Path(directory or os.getenv("GRAPH_DATA_DIR") or default).expanduser().resolve()

    def _path(self, graph_id: str) -> Path:
        if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}", graph_id):
            raise ValueError("Graph ID must be 1–128 letters, digits, underscores, or hyphens")
        path = self.directory / f"{graph_id}.json"
        if path.is_symlink():
            raise ValueError("Graph files cannot be symbolic links")
        return path

    def get(self, graph_id: str) -> StoredGraph:
        return StoredGraph.model_validate_json(self._path(graph_id).read_text(encoding="utf-8"))

    def list(self) -> list[dict]:
        if not self.directory.exists():
            return []
        records = [self.get(path.stem) for path in self.directory.glob("*.json")]
        return [
            {"graph_id": g.graph_id, "title": g.title, "revision": g.revision,
             "updated_at": g.updated_at, "node_count": len(g.nodes), "edge_count": len(g.edges)}
            for g in sorted(records, key=lambda g: g.updated_at, reverse=True)
        ]

    def save(self, graph_id: str, graph: GraphResponse, title: str = "Untitled graph",
             expected_revision: int | None = None) -> StoredGraph:
        path = self._path(graph_id)
        if not title.strip() or len(title) > 256:
            raise ValueError("Title must contain 1–256 characters")
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        with FileLock(str(path.with_suffix(".lock"))):
            # Check again under the lock before accessing an existing file.
            path = self._path(graph_id)
            previous = self.get(graph_id) if path.exists() else None
            revision = previous.revision if previous else 0
            if expected_revision is not None and revision != expected_revision:
                raise RevisionConflict(f"Expected revision {expected_revision}, found {revision}; reload before saving")
            record = StoredGraph(**graph.model_dump(include={"nodes", "edges"}), graph_id=graph_id,
                                 title=title, revision=revision + 1,
                                 updated_at=datetime.now(timezone.utc).isoformat())
            fd, tmp = tempfile.mkstemp(prefix=f".{graph_id}-", dir=self.directory)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as stream:
                    stream.write(record.model_dump_json(indent=2) + "\n")
                os.replace(tmp, path)
            finally:
                Path(tmp).unlink(missing_ok=True)
            return record
