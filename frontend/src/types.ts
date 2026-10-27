export interface GraphNode {
    id: string;
    label: string;
    type: string;
    properties?: Record<string, unknown>;
}

export interface StoredGraph extends GraphData {
    graph_id: string;
    title: string;
    revision: number;
    updated_at: string;
}

export interface GraphSummary {
    graph_id: string;
    title: string;
    revision: number;
    node_count: number;
    edge_count: number;
}

export interface Capabilities {
    llm_enabled: boolean;
    default_model: string | null;
}

export interface GraphEdge {
    source: string;
    target: string;
    relation: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface GraphRequest {
    text: string;
    system_prompt?: string;
    include_current_graph?: boolean;
    current_graph?: GraphData;
    model?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    graphData?: GraphData;
    timestamp: number;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    updatedAt: number;
}
