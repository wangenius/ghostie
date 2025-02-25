import { cn } from '@/lib/utils';
import { Handle, Position } from 'reactflow';
import { PluginNodeConfig } from '../types/nodes';

interface PluginNodeProps {
	data: PluginNodeConfig;
	selected?: boolean;
	isConnectable?: boolean;
}

export const PluginNode = ({ data, selected, isConnectable }: PluginNodeProps) => {
	return (
		<div
			className={cn(
				'px-4 py-2 rounded-lg border-2 shadow-sm min-w-[200px]',
				'bg-green-50 border-green-200',
				selected && 'ring-2 ring-primary'
			)}
		>
			<Handle type="target" position={Position.Left} isConnectable={isConnectable} />

			<div className="flex flex-col gap-1">
				<div className="text-sm font-medium">插件</div>
				{data && (
					<div className="text-xs text-gray-500">
						<div>插件: {data.plugin}</div>
						<div>工具: {data.tool}</div>
						{data.args && (
							<div className="mt-1">
								<div>参数:</div>
								{Object.entries(data.args).map(([key, value]) => (
									<div key={key} className="ml-2">
										{key}: {JSON.stringify(value)}
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>

			<Handle type="source" position={Position.Right} isConnectable={isConnectable} />
		</div>
	);
}; 