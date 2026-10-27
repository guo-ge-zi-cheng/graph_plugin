import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface EditNodeModalProps {
    isOpen: boolean;
    initialLabel: string;
    type?: 'node' | 'edge';
    initialDirection?: 'forward' | 'backward' | 'both' | 'none';
    onClose: () => void;
    onSave: (label: string, direction?: 'forward' | 'backward' | 'both' | 'none') => void;
}

const EditNodeModal: React.FC<EditNodeModalProps> = ({
    isOpen,
    initialLabel,
    type = 'node',
    initialDirection = 'forward',
    onClose,
    onSave,
}) => {
    const [label, setLabel] = useState(initialLabel);
    const [direction, setDirection] = useState<'forward' | 'backward' | 'both' | 'none'>(initialDirection);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-[400px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-100">Edit {type === 'node' ? 'Node' : 'Edge'}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            {type === 'node' ? 'Node Label' : 'Edge Label'}
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSave(label, direction);
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            placeholder={`Enter ${type} label...`}
                            autoFocus
                        />
                    </div>

                    {type === 'edge' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Direction
                            </label>
                            <select
                                value={direction}
                                onChange={(e) => setDirection(e.target.value as typeof direction)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            >
                                <option value="forward">Forward (Start → End)</option>
                                <option value="backward">Backward (Start ← End)</option>
                                <option value="both">Bidirectional (Start ↔ End)</option>
                                <option value="none">None (Start — End)</option>
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave(label, direction)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 font-medium"
                        >
                            <Check size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditNodeModal;
