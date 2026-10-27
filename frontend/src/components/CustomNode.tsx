import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const CustomNode = ({ data, isConnectable }: NodeProps<{ label: string }>) => {
    return (
        <div className="h-full w-full min-h-[40px] flex items-center justify-center">
            {/* Top Handle */}
            <Handle
                type="source"
                position={Position.Top}
                id="top"
                isConnectable={isConnectable}
                className="w-3 h-3 !bg-slate-400 dark:!bg-slate-500 hover:!bg-blue-500 hover:!w-4 hover:!h-4 transition-all"
            />

            {/* Right Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                isConnectable={isConnectable}
                className="w-3 h-3 !bg-slate-400 dark:!bg-slate-500 hover:!bg-blue-500 hover:!w-4 hover:!h-4 transition-all"
            />

            <div className="px-2">
                {data.label}
            </div>

            {/* Bottom Handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                isConnectable={isConnectable}
                className="w-3 h-3 !bg-slate-400 dark:!bg-slate-500 hover:!bg-blue-500 hover:!w-4 hover:!h-4 transition-all"
            />

            {/* Left Handle */}
            <Handle
                type="source"
                position={Position.Left}
                id="left"
                isConnectable={isConnectable}
                className="w-3 h-3 !bg-slate-400 dark:!bg-slate-500 hover:!bg-blue-500 hover:!w-4 hover:!h-4 transition-all"
            />
        </div>
    );
};

export default memo(CustomNode);
