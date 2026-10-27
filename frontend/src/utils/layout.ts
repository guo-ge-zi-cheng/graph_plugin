import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Increase spacing between nodes, and between layers.
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 80, // Horizontal padding between nodes
        ranksep: 120, // Vertical padding between ranks
    });

    const isHorizontal = direction === 'LR';

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 172, height: 36 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - 172 / 2,
            y: nodeWithPosition.y - 36 / 2,
        };

        return node;
    });

    return { nodes: layoutedNodes, edges };
};
