import { NodeProps } from 'reactflow';
import { EndNodeConfig } from '../types/nodes';
import { BaseNode } from './BaseNode';
import { currentAction } from '../WorkflowManager';
import { cn } from '@/lib/utils';

export const EndNode = (props: NodeProps<EndNodeConfig>) => {
	const end = currentAction.use(selector => selector.actions[props.id]);
	if (!end) {
		currentAction.set({
			actions: {
				...currentAction.current.actions,
				[props.id]: {
					id: props.id,
					type: 'end',
					inputs: {},
					outputs: {},
					startTime: new Date().toISOString(),
					status: 'pending',
					result: { success: false, data: null },
				},
			},
		});
	}

	return (
		<BaseNode
			{...props}
			left={1}
			right={0}
			shape="end"
			size="md"
			variant="primary"
			state={end?.status === 'completed' ? 'completed' :
				end?.status === 'failed' ? 'failed' :
					end?.status === 'running' ? 'running' :
						'pending'}
		>
			<div className="flex flex-col items-center text-center">
				{/* 标题区域 */}
				<div className="w-full">
					<div className={cn(
						"text-base font-bold mb-1",
						end?.status === 'completed' ? "text-green-700" :
							end?.status === 'failed' ? "text-red-700" :
								"text-gray-700"
					)}>
						{props.data.name || '结束'}
					</div>

				</div>



				{/* 结果数据展示 */}
				{end?.result.success && end.result.data && (
					<div className="w-full">
						<div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
							执行结果
						</div>
						<div className="space-y-1.5 text-left">
							{Object.entries(end.result.data).map(([key, value]) => (
								<div
									key={key}
									className="flex items-center justify-between bg-white/50 px-2 py-1 rounded-md"
								>
									<span className="text-xs font-medium text-gray-600">{key}</span>
									<span className="text-xs text-gray-500 max-w-[160px] truncate">
										{String(value)}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</BaseNode>
	);
};