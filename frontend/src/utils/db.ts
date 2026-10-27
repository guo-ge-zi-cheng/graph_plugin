import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Conversation } from '../types';
import { Node, Edge } from 'reactflow';

interface GraphDB extends DBSchema {
    conversations: {
        key: string;
        value: Conversation;
        indexes: { 'by-updated': number };
    };
    snapshots: {
        key: string; // conversationId
        value: {
            conversationId: string;
            nodes: Node[];
            edges: Edge[];
            updatedAt: number;
        };
    };
}

const DB_NAME = 'graph-analysis-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GraphDB>>;

export const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<GraphDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Store for conversations (metadata + lightweight message history)
                // If messages get huge, we might split them out, but start simple.
                const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
                convStore.createIndex('by-updated', 'updatedAt');

                // Store for the exact state of the graph (nodes + edges)
                // Keyed by conversationId
                db.createObjectStore('snapshots', { keyPath: 'conversationId' });
            },
        });
    }
    return dbPromise;
};

// Conversation Operations
export const saveConversation = async (conversation: Conversation) => {
    const db = await getDB();
    await db.put('conversations', conversation);
};

export const getConversation = async (id: string) => {
    const db = await getDB();
    return db.get('conversations', id);
};

export const getAllConversations = async () => {
    const db = await getDB();
    return db.getAllFromIndex('conversations', 'by-updated');
};

export const deleteConversation = async (id: string) => {
    const db = await getDB();
    await db.delete('conversations', id);
    await db.delete('snapshots', id);
};

// Snapshot Operations (Graph persistence)
export const saveGraphSnapshot = async (conversationId: string, nodes: Node[], edges: Edge[]) => {
    const db = await getDB();
    await db.put('snapshots', {
        conversationId,
        nodes,
        edges,
        updatedAt: Date.now(),
    });
};

export const getGraphSnapshot = async (conversationId: string) => {
    const db = await getDB();
    return db.get('snapshots', conversationId);
};
