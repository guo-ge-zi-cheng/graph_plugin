import React, { useMemo, useState, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Panel,
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    ReactFlowProvider,
    Connection,
    ConnectionMode,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Trash2 } from 'lucide-react';
import EditNodeModal from './EditNodeModal';
import CustomNode from './CustomNode';
import { NODE_CLASS_NAME } from '../constants';

interface GraphViewProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

const GraphViewContent: React.FC<GraphViewProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    setNodes,
    setEdges,
}) => {
    const [isdataModalOpen, setIsDataModalOpen] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
    const [editingLabel, setEditingLabel] = useState('');
    const [editingType, setEditingType] = useState<'node' | 'edge'>('node');
    const [editingDirection, setEditingDirection] = useState<'forward' | 'backward' | 'both' | 'none'>('forward');

    const nodeTypes = useMemo(() => ({
        default: CustomNode,
        custom: CustomNode
    }), []);

    const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
        setEditingNodeId(node.id);
        setEditingEdgeId(null);
        setEditingLabel(node.data.label);
        setEditingType('node');
        setIsDataModalOpen(true);
    }, []);

    const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setEditingEdgeId(edge.id);
        setEditingNodeId(null);
        setEditingLabel(edge.label as string || '');
        setEditingType('edge');

        // Determine direction
        const hasStart = !!edge.markerStart;
        const hasEnd = !!edge.markerEnd;

        if (hasStart && hasEnd) setEditingDirection('both');
        else if (hasStart) setEditingDirection('backward');
        else if (hasEnd) setEditingDirection('forward');
        else setEditingDirection('none');

        setIsDataModalOpen(true);
    }, []);

    const handleSave = (newLabel: string, direction?: 'forward' | 'backward' | 'both' | 'none') => {
        if (editingNodeId) {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === editingNodeId) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                label: newLabel,
                            },
                        };
                    }
                    return node;
                })
            );
        } else if (editingEdgeId) {
            setEdges((eds) =>
                eds.map((edge) => {
                    if (edge.id === editingEdgeId) {
                        const newEdge = {
                            ...edge,
                            label: newLabel,
                        };

                        if (direction) {
                            // Reset markers
                            newEdge.markerStart = undefined;
                            newEdge.markerEnd = undefined;

                            const arrowMarker = {
                                type: MarkerType.ArrowClosed,
                                width: 20,
                                height: 20,
                                color: '#b1b1b7',
                            };

                            if (direction === 'forward') {
                                newEdge.markerEnd = arrowMarker;
                            } else if (direction === 'backward') {
                                newEdge.markerStart = arrowMarker;
                            } else if (direction === 'both') {
                                newEdge.markerStart = arrowMarker;
                                newEdge.markerEnd = arrowMarker;
                            }
                        }
                        return newEdge;
                    }
                    return edge;
                })
            );
        }
        setIsDataModalOpen(false);
        setEditingNodeId(null);
        setEditingEdgeId(null);
    };

    const handleAddNode = () => {
        const id = crypto.randomUUID();
        const newNode: Node = {
            id,
            position: {
                x: Math.random() * 500,
                y: Math.random() * 500,
            },
            data: { label: `New Node` },
            type: 'default', // Uses CustomNode via nodeTypes
            className: NODE_CLASS_NAME,
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const handleDeleteSelected = () => {
        const selectedNodeIds = new Set(nodes.filter(node => node.selected).map(node => node.id));
        setNodes(current => current.filter(node => !selectedNodeIds.has(node.id)));
        setEdges(current => current.filter(edge => !edge.selected &&
            !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)));
    };

    return (
        <div className="flex-grow h-full w-full bg-slate-900 relative group">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onReconnect={onReconnect}
                onNodeDoubleClick={onNodeDoubleClick}
                onEdgeDoubleClick={onEdgeDoubleClick}
                nodeTypes={nodeTypes}
                fitView
                className="bg-slate-900"
                deleteKeyCode={['Backspace', 'Delete']}
                snapToGrid={true}
                snapGrid={[15, 15]}
                connectionMode={ConnectionMode.Loose}
            >
                <Background color="#475569" gap={16} />
                <Controls className="bg-slate-800 text-slate-200 border-slate-600 fill-current" />
                <MiniMap
                    className="bg-slate-800 border-slate-600 !bottom-4 !right-4 rounded-lg overflow-hidden"
                    nodeColor={(n) => {
                        if (n.type === 'input') return '#3b82f6';
                        if (n.type === 'output') return '#10b981';
                        return '#64748b';
                    }}
                    maskColor="rgba(15, 23, 42, 0.7)"
                />

                <Panel position="top-right" className="flex gap-2 p-2">
                    <button
                        onClick={handleAddNode}
                        className="bg-slate-800 text-white p-2 rounded-md border border-slate-700 hover:bg-slate-700 transition-colors shadow-lg flex items-center gap-2 text-xs font-medium"
                        title="Add Node"
                    >
                        <Plus size={16} />
                        Add Node
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        className="bg-slate-800 text-red-400 p-2 rounded-md border border-slate-700 hover:bg-slate-700 transition-colors shadow-lg flex items-center gap-2 text-xs font-medium"
                        title="Delete Selected"
                    >
                        <Trash2 size={16} />
                        Delete
                    </button>
                </Panel>
            </ReactFlow>

            {isdataModalOpen && <EditNodeModal
                isOpen={isdataModalOpen}
                initialLabel={editingLabel}
                type={editingType}
                initialDirection={editingDirection}
                onClose={() => setIsDataModalOpen(false)}
                onSave={handleSave}
            />}
        </div>
    );
};

const GraphView: React.FC<GraphViewProps> = (props) => {
    return (
        <ReactFlowProvider>
            <GraphViewContent {...props} />
        </ReactFlowProvider>
    );
};

export default GraphView;
