import { useCallback, useEffect, useState } from 'react';
import { MarkerType, Node, Edge } from 'reactflow';
import { getErrorMessage, getSharedGraph, listSharedGraphs, saveSharedGraph, validateGraph } from '../api';
import { GraphData, GraphSummary } from '../types';
import { getLayoutedElements } from '../utils/layout';
import { EDGE_LABEL_BG_STYLE, EDGE_LABEL_STYLE, EDGE_STYLE, NODE_CLASS_NAME } from '../constants';

interface Props {
    nodes: Node[];
    edges: Edge[];
    onUpdateGraph: (nodes: Node[], edges: Edge[]) => void;
}

export default function SharedGraphPanel({ nodes, edges, onUpdateGraph }: Props) {
    const [open, setOpen] = useState(false);
    const [graphs, setGraphs] = useState<GraphSummary[]>([]);
    const [id, setId] = useState('my-graph');
    const [title, setTitle] = useState('My graph');
    const [loaded, setLoaded] = useState<{ id: string; revision: number } | null>(null);
    const [json, setJson] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => setGraphs(await listSharedGraphs()), []);
    useEffect(() => {
        if (open) refresh().catch(error => setMessage(getErrorMessage(error)));
    }, [open, refresh]);

    const applyGraph = (graph: GraphData) => {
        const nextNodes: Node[] = graph.nodes.map(node => ({
            id: node.id, type: 'default', position: { x: 0, y: 0 }, className: NODE_CLASS_NAME,
            data: { label: node.label, entityType: node.type, properties: node.properties || {} },
        }));
        const nextEdges: Edge[] = graph.edges.map((edge, index) => ({
            id: `shared-${index}`, source: edge.source, target: edge.target, label: edge.relation,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
            style: EDGE_STYLE, labelStyle: EDGE_LABEL_STYLE, labelBgStyle: EDGE_LABEL_BG_STYLE,
        }));
        const result = getLayoutedElements(nextNodes, nextEdges);
        onUpdateGraph(result.nodes, result.edges);
    };

    const currentGraph = (): GraphData => ({
        nodes: nodes.map(node => ({ id: node.id, label: node.data.label,
            type: node.data.entityType || 'default', properties: node.data.properties || {} })),
        edges: edges.map(edge => ({ source: edge.source, target: edge.target, relation: String(edge.label || 'related to') })),
    });

    const run = async (operation: () => Promise<void>) => {
        setBusy(true);
        setMessage('');
        try { await operation(); } catch (error) { setMessage(getErrorMessage(error)); }
        finally { setBusy(false); }
    };

    const load = (graphId: string) => run(async () => {
        const graph = await getSharedGraph(graphId);
        applyGraph(graph);
        setId(graphId);
        setTitle(graph.title);
        setLoaded({ id: graphId, revision: graph.revision });
        setMessage(`Loaded revision ${graph.revision}. Refresh and load again to see agent changes.`);
    });

    const save = () => run(async () => {
        const graph = await saveSharedGraph(id, currentGraph(), title, loaded?.id === id ? loaded.revision : 0);
        setLoaded({ id, revision: graph.revision });
        await refresh();
        setMessage(`Saved revision ${graph.revision}. Your agent can read this graph now.`);
    });

    const exportJSON = () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(currentGraph(), null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'graph.json';
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const fieldClass = 'w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100';
    const buttonClass = 'rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-xs disabled:opacity-50';

    return <div className="absolute top-4 left-4 z-30 max-w-[calc(100%-2rem)]">
        <button onClick={() => setOpen(!open)} aria-expanded={open}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg">
            Agent graphs {open ? '−' : '+'}
        </button>
        {open && <section aria-label="Agent graph tools" className="mt-2 w-80 max-w-full max-h-[75vh] overflow-auto rounded-xl border border-slate-600 bg-slate-900 p-4 shadow-xl space-y-3">
            <p className="text-sm text-slate-300">Share graphs with your CLI agent. No API key required.</p>
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Saved graphs</span>
                <button disabled={busy} className={buttonClass} onClick={() => run(refresh)}>Refresh</button>
            </div>
            {graphs.length === 0 && <p className="text-xs text-slate-500">No saved graphs yet.</p>}
            {graphs.map(graph => <button key={graph.graph_id} disabled={busy} onClick={() => load(graph.graph_id)}
                className="block w-full rounded bg-slate-800 px-3 py-2 text-left text-sm hover:bg-slate-700">
                {graph.title}<span className="block text-xs text-slate-400">{graph.graph_id} · {graph.node_count} nodes · r{graph.revision}</span>
            </button>)}
            <label className="block text-xs text-slate-400">Graph ID
                <input aria-label="Graph ID" className={fieldClass} value={id} onChange={event => setId(event.target.value)} />
            </label>
            <label className="block text-xs text-slate-400">Title
                <input aria-label="Graph title" className={fieldClass} value={title} onChange={event => setTitle(event.target.value)} />
            </label>
            <div className="flex gap-2">
                <button disabled={busy || !id.trim()} className={buttonClass} onClick={save}>Save canvas</button>
                <button className={buttonClass} onClick={exportJSON}>Export JSON</button>
            </div>
            <label className="block text-xs text-slate-400">Import graph JSON
                <textarea aria-label="Import graph JSON" className={`${fieldClass} h-24 font-mono`} value={json}
                    onChange={event => setJson(event.target.value)} placeholder={'{"nodes": [], "edges": []}'} />
            </label>
            <button disabled={busy || !json.trim()} className={buttonClass} onClick={() => run(async () => {
                applyGraph(await validateGraph(JSON.parse(json)));
                setMessage('Imported to canvas. Save canvas to share it with your agent.');
            })}>Import to canvas</button>
            {message && <p role="status" className="text-xs text-sky-300 break-words">{message}</p>}
        </section>}
    </div>;
}
