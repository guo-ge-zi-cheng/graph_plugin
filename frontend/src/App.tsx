import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    MarkerType,
    reconnectEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Sidebar from './components/Sidebar';
import GraphView from './components/GraphView';
import SharedGraphPanel from './components/SharedGraphPanel';
import { getGraphSnapshot, saveGraphSnapshot } from './utils/db';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const App: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [showChat, setShowChat] = useState(false);

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load graph snapshot when switching conversations
    useEffect(() => {
        let isMounted = true;
        const loadGraph = async () => {
            if (!currentConversationId) {
                if (isMounted) {
                    setNodes([]);
                    setEdges([]);
                }
                return;
            }
            try {
                const snapshot = await getGraphSnapshot(currentConversationId);
                if (isMounted) {
                    if (snapshot) {
                        setNodes(snapshot.nodes || []);
                        setEdges(snapshot.edges || []);
                    } else {
                        setNodes([]);
                        setEdges([]);
                    }
                }
            } catch (error) {
                console.error("Failed to load graph snapshot:", error);
            }
        };
        loadGraph();
        return () => { isMounted = false; };
    }, [currentConversationId, setNodes, setEdges]);

    // Save graph snapshot automatically when nodes/edges change
    useEffect(() => {
        if (!currentConversationId) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveGraphSnapshot(currentConversationId, nodes, edges)
                .catch(err => console.error("Failed to save graph snapshot:", err));
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [nodes, edges, currentConversationId]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            type: 'default', // Using default bezier curve
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#b1b1b7',
            },
            label: 'New Relation',
            style: { strokeWidth: 2 }
        }, eds)),
        [setEdges]
    );

    const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    }, [setEdges]);

    const handleGraphUpdate = useCallback((newNodes: Node[], newEdges: Edge[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
    }, [setNodes, setEdges]);

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-900 text-slate-100 font-sans">
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700 px-4">
                <span className="font-semibold">Graph Analysis</span>
                <button onClick={() => setShowChat(!showChat)} aria-expanded={showChat}
                    className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700">
                    {showChat ? 'Hide chat' : 'Standalone chat'}
                </button>
            </header>
            <div className="relative flex flex-1 min-h-0">
            <div className="flex-1 min-w-0 h-full relative">
                <GraphView
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onReconnect={onReconnect}
                    setNodes={setNodes}
                    setEdges={setEdges}
                />
                <SharedGraphPanel nodes={nodes} edges={edges} onUpdateGraph={handleGraphUpdate} />
            </div>
            <div className={showChat ? 'absolute inset-y-0 right-0 z-40 h-full shrink-0 md:static' : 'hidden'}>
            <Sidebar
                onUpdateGraph={handleGraphUpdate}
                currentConversationId={currentConversationId}
                onSelectConversation={setCurrentConversationId}
                nodes={nodes}
                edges={edges}
            />
            </div>
            </div>
        </div>
    );
};

export default App;
