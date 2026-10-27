import axios from 'axios';
import { Capabilities, GraphData, GraphSummary, StoredGraph } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const getCapabilities = async (): Promise<Capabilities> =>
    (await axios.get<Capabilities>(`${API_URL}/capabilities`)).data;

export const validateGraph = async (graph: unknown): Promise<GraphData> =>
    (await axios.post<GraphData>(`${API_URL}/validate-graph`, graph)).data;

export const listSharedGraphs = async (): Promise<GraphSummary[]> =>
    (await axios.get<GraphSummary[]>(`${API_URL}/graphs`)).data;

export const getSharedGraph = async (id: string): Promise<StoredGraph> =>
    (await axios.get<StoredGraph>(`${API_URL}/graphs/${encodeURIComponent(id)}`)).data;

export const saveSharedGraph = async (id: string, graph: GraphData, title: string, revision: number): Promise<StoredGraph> =>
    (await axios.put<StoredGraph>(`${API_URL}/graphs/${encodeURIComponent(id)}`, {
        ...graph, title, expected_revision: revision,
    })).data;

export const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
        return error.response.data.detail;
    }
    return error instanceof Error ? error.message : 'The request failed.';
};

export const generateGraph = async (
    text: string,
    system_prompt?: string,
    include_current_graph: boolean = false,
    currentGraph?: GraphData,
    model?: string
): Promise<GraphData> => {
    try {
        const payload = {
            text,
            system_prompt,
            include_current_graph,
            current_graph: currentGraph,
            model,
        };
        const response = await axios.post<GraphData>(`${API_URL}/generate-graph`, payload);
        return response.data;
    } catch (error) {
        console.error("Error generating graph:", error);
        throw error;
    }
};
