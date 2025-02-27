import { NodeProps } from 'reactflow';
import { EndNodeConfig } from '../types/nodes';
import { NodePortal } from './NodePortal';
import { CurrentActionState } from '../WorkflowManager';

export const EndNode = (props: NodeProps<EndNodeConfig>) => {
	const end = CurrentActionState.use(selector => selector.actions[props.id]);
	if (!end) {
		CurrentActionState.set({
			actions: {
				...CurrentActionState.current.actions,
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
		<NodePortal
			{...props}
			left={1}
			right={0}
			variant="default"
			title="结束"
			state={end?.status === 'completed' ? 'completed' :
				end?.status === 'failed' ? 'failed' :
					end?.status === 'running' ? 'running' :
						'pending'}
		>
			<div className="flex flex-col items-center text-center">
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
		</NodePortal>
	);
};