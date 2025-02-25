import { Handle, NodeProps, Position } from 'reactflow';
import { cn } from '@/lib/utils';
import { BranchNodeConfig } from '../types/nodes';


export const BranchNode = ({ data, selected, isConnectable }: NodeProps<BranchNodeConfig>) => {

	return (
		<div
			className={cn(
				'px-4 py-2 rounded-lg border-2 shadow-sm min-w-[200px]',
				'bg-yellow-50 border-yellow-200',
				selected && 'ring-2 ring-primary'
			)}
		>
			<Handle type="target" position={Position.Left} isConnectable={isConnectable} />

			<div className="flex flex-col gap-1">
				<div className="text-sm font-medium">条件分支</div>
				{data.conditions && (
					<div className="text-xs text-gray-500">
						<div>条件分支:</div>
						{data.conditions.map((condition, index) => (
							<div key={index} className="ml-2 mt-1">
								<div>标签: {condition.label}</div>
								<div>表达式: {condition.expression}</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* 为每个条件创建一个输出连接点 */}
			{data.conditions.map((_, index) => (
				<Handle
					key={index}
					type="source"
					position={Position.Right}
					id={`condition-${index}`}
					style={{ left: `${(index + 1) * (100 / (data.conditions.length + 1))}%` }}
					isConnectable={isConnectable}
				/>
			))}
		</div>
	);
}; 