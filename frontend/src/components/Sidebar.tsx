import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send,
    Plus,
    MessageSquare,
    Trash2,
    Loader2,
    PanelRightClose,
    PanelRightOpen
} from 'lucide-react';
import { generateGraph, getCapabilities, getErrorMessage } from '../api';
import { GraphData, Message, Conversation } from '../types';
import { MarkerType, Node, Edge } from 'reactflow';
import { getLayoutedElements } from '../utils/layout';
import {
    getAllConversations,
    saveConversation,
    deleteConversation as deleteConversationDB,
} from '../utils/db';
import {

    NODE_CLASS_NAME,
    EDGE_STYLE,
    EDGE_LABEL_STYLE,
    EDGE_LABEL_BG_STYLE,
    SYSTEM_PROMPT_TEMPLATES
} from '../constants';
import SystemPromptModal from './SystemPromptModal';

interface SidebarProps {
    onUpdateGraph: (nodes: Node[], edges: Edge[]) => void;
    currentConversationId: string | null;
    onSelectConversation: (id: string | null) => void;
    nodes: Node[];
    edges: Edge[];
}

const Sidebar: React.FC<SidebarProps> = ({
    onUpdateGraph,
    currentConversationId,
    onSelectConversation,
    nodes,
    edges
}) => {
    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // System Prompt State
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [customPrompt, setCustomPrompt] = useState(SYSTEM_PROMPT_TEMPLATES[0].prompt);
    const [includeGraph, setIncludeGraph] = useState(false);

    const [model, setModel] = useState('');
    const [llmEnabled, setLlmEnabled] = useState(false);
    const [defaultModel, setDefaultModel] = useState('Model name');

    useEffect(() => {
        getCapabilities().then(status => {
            setLlmEnabled(status.llm_enabled);
            setDefaultModel(status.default_model || 'Model name');
        }).catch(() => setLlmEnabled(false));
    }, []);
    // Local message state for the *current* conversation to avoid flicker
    // But we can just derive it from conversations array if it's small enough.
    // Actually, let's keep the full list in memory for now.

    // Refs for scrolling
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const startNewChat = useCallback(async () => {
        const newId = crypto.randomUUID();
        const newConv: Conversation = { id: newId, title: 'New Analysis', messages: [], updatedAt: Date.now() };
        await saveConversation(newConv);
        setConversations(prev => [newConv, ...prev]);
        onSelectConversation(newId);
        setShowHistory(false);
    }, [onSelectConversation]);

    // Load initial conversation list
    useEffect(() => {
        let cancelled = false;
        const loadHistory = async () => {
            try {
                const loaded = await getAllConversations();
                if (cancelled) return;
                // Sort by updatedAt desc
                loaded.sort((a, b) => b.updatedAt - a.updatedAt);
                setConversations(loaded);

                if (loaded.length > 0) {
                    // Optionally auto-select first
                    onSelectConversation(loaded[0].id);
                } else if (loaded.length === 0) {
                    startNewChat();
                }
            } catch (error) {
                console.error("Failed to load history:", error);
            }
        };
        loadHistory();
        return () => { cancelled = true; };
    }, [onSelectConversation, startNewChat]);

    // Scroll to bottom on updates
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversations, currentConversationId, loading]);

    // Construct graph from data
    const processGraphData = (data: GraphData) => {
        const newNodes: Node[] = data.nodes.map((node) => ({
            id: node.id,
            data: { label: node.label, entityType: node.type, properties: node.properties || {} },
            position: { x: 0, y: 0 },
            type: 'default',
            className: NODE_CLASS_NAME,
        }));

        const newEdges: Edge[] = data.edges.map((edge, index) => ({
            id: `e${index}-${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            label: edge.relation,
            animated: true,
            type: 'smoothstep',
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#64748b',
            },
            style: EDGE_STYLE,
            labelStyle: EDGE_LABEL_STYLE,
            labelBgStyle: EDGE_LABEL_BG_STYLE,
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            newNodes,
            newEdges
        );

        onUpdateGraph(layoutedNodes, layoutedEdges);
    };

    const handleSendMessage = async () => {
        if (!llmEnabled || loading || !inputText.trim() || !currentConversationId) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: inputText,
            timestamp: Date.now(),
        };

        // Optimistic Update
        const updatedConversations = conversations.map(c => {
            if (c.id === currentConversationId) {
                return {
                    ...c,
                    messages: [...c.messages, userMsg],
                    title: c.messages.length === 0 ? inputText.slice(0, 30) : c.title,
                    updatedAt: Date.now()
                };
            }
            return c;
        });

        // Sort again
        updatedConversations.sort((a, b) => b.updatedAt - a.updatedAt);
        setConversations(updatedConversations);

        // Save to DB
        const currentConv = updatedConversations.find(c => c.id === currentConversationId);
        if (currentConv) await saveConversation(currentConv);

        setInputText('');
        setLoading(true);

        try {
            let currentGraphData = undefined;
            if (nodes.length > 0) {
                currentGraphData = {
                    nodes: nodes.map(n => ({ id: n.id, label: n.data.label, type: n.data.entityType || 'default', properties: n.data.properties || {} })),
                    edges: edges.map(e => ({ source: e.source, target: e.target, relation: e.label as string || '' }))
                };
            }

            const data: GraphData = await generateGraph(
                inputText,
                customPrompt,
                includeGraph,
                currentGraphData,
                model || undefined
            );

            const botMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "Graph generated successfully.",
                graphData: data,
                timestamp: Date.now(),
            };

            const finalConversations = updatedConversations.map(c => {
                if (c.id === currentConversationId) {
                    return {
                        ...c,
                        messages: [...c.messages, botMsg],
                        updatedAt: Date.now()
                    };
                }
                return c;
            })
            // Sort
            finalConversations.sort((a, b) => b.updatedAt - a.updatedAt);
            setConversations(finalConversations);

            const finalConv = finalConversations.find(c => c.id === currentConversationId);
            if (finalConv) await saveConversation(finalConv);

            processGraphData(data); // This updates graph view -> App state -> triggers snapshot save

        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: getErrorMessage(error),
                timestamp: Date.now(),
            };

            const errorConversations = updatedConversations.map(c => {
                if (c.id === currentConversationId) {
                    return { ...c, messages: [...c.messages, errorMsg] };
                }
                return c;
            });
            setConversations(errorConversations);
            const errorConv = errorConversations.find(c => c.id === currentConversationId);
            if (errorConv) await saveConversation(errorConv);
        } finally {
            setLoading(false);
        }
    };

    const deleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteConversationDB(id);
        const remaining = conversations.filter(c => c.id !== id);
        setConversations(remaining);

        if (currentConversationId === id) {
            if (remaining.length > 0) {
                onSelectConversation(remaining[0].id);
            } else {
                onSelectConversation(null); // Or startNewChat()
                startNewChat();
            }
        }
    };

    const selectConversation = (id: string) => {
        onSelectConversation(id);
        setShowHistory(false);
    };

    const activeConversation = conversations.find(c => c.id === currentConversationId);

    return (
        <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20 transition-all duration-300">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                        title="History"
                    >
                        {showHistory ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                    </button>
                    <span className="font-bold text-slate-100 text-lg">GraphChat</span>
                </div>
                <button
                    onClick={() => startNewChat()}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-lg shadow-blue-900/20"
                    title="New Chat"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-hidden relative">
                {showHistory ? (
                    <div className="absolute inset-0 bg-slate-900 z-10 overflow-y-auto p-2 space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 mt-2">History</div>
                        {conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => selectConversation(conv.id)}
                                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border border-transparent ${currentConversationId === conv.id
                                    ? 'bg-slate-800 border-slate-700 text-white'
                                    : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <MessageSquare size={18} />
                                <div className="flex-1 truncate text-sm font-medium">
                                    {conv.title || 'Untitled Chat'}
                                </div>
                                <button
                                    onClick={(e) => deleteConversation(e, conv.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col p-4 overflow-y-auto space-y-6">
                        {(!activeConversation || activeConversation.messages.length === 0) && (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-6 mt-10">
                                <MessageSquare size={48} className="mb-4 text-slate-700" />
                                <h3 className="text-lg font-medium text-slate-300">Start Analysis</h3>
                                <p className="text-sm mt-2 max-w-[200px]">Describe a relationship or scenario to generate a knowledge graph.</p>
                            </div>
                        )}

                        {activeConversation?.messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                            >
                                <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                                    }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[10px] text-slate-600 mt-1 px-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        {loading && (
                            <div className="self-start bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                                <Loader2 className="animate-spin text-blue-500" size={16} />
                                <span className="text-sm text-slate-400">Thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                {/* Controls */}
                <div className="flex gap-2 mb-2 items-center">
                    <button
                        onClick={() => setIsPromptModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-md transition-all flex items-center gap-1.5"
                    >
                        <MessageSquare size={14} />
                        System Prompt
                    </button>

                    <button
                        onClick={() => setIncludeGraph(!includeGraph)}
                        className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-all flex items-center gap-1.5 ${includeGraph
                            ? 'bg-blue-600/20 border-blue-600/50 text-blue-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                        title="Include current graph data in the context"
                    >
                        Context: {includeGraph ? 'ON' : 'OFF'}
                    </button>
                    <input
                        aria-label="LLM model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={defaultModel}
                        className="bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 px-2 py-1 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="relative flex items-end gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        aria-label="Graph generation prompt"
                        disabled={!llmEnabled}
                        placeholder={llmEnabled ? 'Type a message...' : 'Standalone LLM is not configured'}
                        className="w-full bg-transparent text-slate-200 text-sm p-2 max-h-32 min-h-[44px] resize-none focus:outline-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
                        rows={1}
                        style={{ height: 'auto' }}
                    />
                    <button
                        onClick={handleSendMessage}
                        aria-label="Generate graph"
                        disabled={!llmEnabled || loading || !inputText.trim()}
                        className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-all flex-shrink-0 mb-0.5"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    </button>
                </div>
                <div className="text-[10px] text-center text-slate-600 mt-2">
                    {llmEnabled ? 'Start a new conversation for a fresh context.' : 'Use Agent graphs or import JSON without an API key. Add your own provider settings to enable chat.'}
                </div>
            </div>

            {isPromptModalOpen && <SystemPromptModal
                isOpen={isPromptModalOpen}
                onClose={() => setIsPromptModalOpen(false)}
                currentPrompt={customPrompt}
                onSave={(prompt, incGraph) => {
                    setCustomPrompt(prompt);
                    setIncludeGraph(incGraph);
                    setIsPromptModalOpen(false);
                }}
                currentGraphData={{
                    nodes: nodes.map(n => ({ id: n.id, label: n.data.label, type: n.data.entityType || 'default', properties: n.data.properties || {} })),
                    edges: edges.map(e => ({ source: e.source, target: e.target, relation: e.label as string || '' }))
                }}
                includeGraphInitial={includeGraph}
            />}
        </div>
    );
};

export default Sidebar;
