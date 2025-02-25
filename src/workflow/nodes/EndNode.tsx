import { BaseNode } from './BaseNode';
import { NodeProps } from 'reactflow';

interface EndNodeConfig {
	name: string;
}


export const EndNode = (props: NodeProps<EndNodeConfig>) => {
	return (
		<BaseNode
			{...props}
			left={1}
			right={0}
		>
			<div className="text-sm font-medium">{props.data.name}</div>
		</BaseNode>
	);
}; 