from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .llm import LLMNotConfigured, LLMProviderError, capabilities, generate_graph_from_text
from .models import GraphResponse, SaveGraphRequest, StoredGraph, TextRequest
from .store import GraphStore, RevisionConflict

app = FastAPI(title="Graph Analysis", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "PUT", "POST"], allow_headers=["Content-Type"],
)


@app.exception_handler(RevisionConflict)
async def revision_error(_: Request, error: RevisionConflict):
    return JSONResponse(status_code=409, content={"detail": str(error)})


@app.exception_handler(FileNotFoundError)
async def missing_graph(_: Request, error: FileNotFoundError):
    return JSONResponse(status_code=404, content={"detail": "Graph not found"})


@app.exception_handler(ValueError)
async def invalid_graph(_: Request, error: ValueError):
    return JSONResponse(status_code=400, content={"detail": "Invalid graph ID or graph data"})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/capabilities")
def get_capabilities():
    return capabilities()


@app.post("/generate-graph", response_model=GraphResponse)
def generate_graph(request: TextRequest):
    # Thread-pool execution keeps a slow provider from blocking /health.
    try:
        return generate_graph_from_text(**request.model_dump(exclude={"current_graph"}),
                                        current_graph=request.current_graph)
    except LLMNotConfigured as error:
        return JSONResponse(status_code=503, content={"detail": str(error)})
    except LLMProviderError as error:
        return JSONResponse(status_code=502, content={"detail": str(error)})


@app.get("/graphs")
def list_graphs():
    return GraphStore().list()


@app.post("/validate-graph", response_model=GraphResponse)
def validate_graph(graph: GraphResponse):
    return graph


@app.get("/graphs/{graph_id}", response_model=StoredGraph)
def get_graph(graph_id: str):
    return GraphStore().get(graph_id)


@app.put("/graphs/{graph_id}", response_model=StoredGraph)
def save_graph(graph_id: str, request: SaveGraphRequest):
    return GraphStore().save(graph_id, request, request.title, request.expected_revision)
