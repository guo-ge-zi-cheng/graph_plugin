import React, { useState } from 'react';
import { X, Save, FileJson, LayoutTemplate } from 'lucide-react';
import { SYSTEM_PROMPT_TEMPLATES } from '../constants';
import { GraphData } from '../types';

interface SystemPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPrompt: string;
    onSave: (prompt: string, includeGraph: boolean) => void;
    currentGraphData?: GraphData;
    includeGraphInitial: boolean;
}

const SystemPromptModal: React.FC<SystemPromptModalProps> = ({
    isOpen,
    onClose,
    currentPrompt,
    onSave,
    currentGraphData,
    includeGraphInitial
}) => {
    const [promptText, setPromptText] = useState(currentPrompt);
    const [includeGraph, setIncludeGraph] = useState(includeGraphInitial);

    if (!isOpen) return null;

    const handleTemplateClick = (templatePrompt: string) => {
        setPromptText(templatePrompt);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-[90vw] h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-slate-100">
                        <LayoutTemplate size={20} className="text-blue-500" />
                        <h2 className="font-semibold text-lg">System Prompt Editor</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Templates & Editor */}
                    <div className="flex-1 flex flex-col border-r border-slate-800 min-w-0">
                        {/* Templates Horizontal Scroll */}
                        <div className="p-3 border-b border-slate-800 bg-slate-900 overflow-x-auto flex gap-2 no-scrollbar">
                            {SYSTEM_PROMPT_TEMPLATES.map((tpl, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleTemplateClick(tpl.prompt)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white whitespace-nowrap transition-colors flex flex-col items-start gap-0.5"
                                >
                                    <span className="font-medium">{tpl.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Editor Area */}
                        <div className="flex-1 p-4 flex flex-col gap-2 relative">
                            <label className="text-xs text-slate-500 font-medium uppercase">Prompt Content</label>
                            <textarea
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                className="flex-1 w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 font-mono resize-none focus:outline-none focus:border-blue-500/50 transition-all leading-relaxed"
                                placeholder="Enter system instructions here..."
                                spellCheck={false}
                            />

                            {/* Toggle Overlay at bottom */}
                            <div className="absolute bottom-6 left-6 right-6 bg-slate-900/90 border border-slate-700 backdrop-blur-md p-3 rounded-lg flex items-center justify-between shadow-lg">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-200">Include Current Graph Context</span>
                                    <span className="text-xs text-slate-500">Appends the current graph JSON to your prompt</span>
                                </div>
                                <button
                                    onClick={() => setIncludeGraph(!includeGraph)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${includeGraph ? 'bg-blue-600' : 'bg-slate-700'}`}
                                >
                                    <span
                                        className={`${includeGraph ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Data Visualization */}
                    <div className="w-1/3 flex flex-col bg-slate-950/50 min-w-[300px]">
                        <div className="p-3 border-b border-slate-800 flex items-center gap-2 text-slate-400">
                            <FileJson size={16} />
                            <span className="text-xs font-medium uppercase tracking-wider">Context Visualization</span>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {includeGraph ? (
                                currentGraphData ? (
                                    <pre className="text-[10px] sm:text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
                                        {JSON.stringify(currentGraphData, null, 2)}
                                    </pre>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                        <FileJson size={32} className="opacity-20" />
                                        <p className="text-xs text-center">No graph data available yet.<br />Start a new conversation to generate data.</p>
                                    </div>
                                )
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 opacity-50">
                                    <p className="text-xs text-center max-w-[200px]">
                                        Graph context is disabled.<br />
                                        Enable the toggle to include graph data in the prompt.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(promptText, includeGraph)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
                    >
                        <Save size={16} />
                        Apply Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemPromptModal;
