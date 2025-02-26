import { NodeProps } from 'reactflow';
import { EndNodeConfig } from '../types/nodes';
import { BaseNode } from './BaseNode';

export const EndNode = (props: NodeProps<EndNodeConfig>) => {
	return (
		<BaseNode
			{...props}
			left={1}
			right={0}
		>
			<div className="flex flex-col gap-2">
				<div className="text-sm font-medium">{props.data.name}</div>
				{props.data.result && (
					<div className="text-sm text-muted-foreground">
						结果: {props.data.result}
					</div>
				)}
			</div>
		</BaseNode>
	);
};