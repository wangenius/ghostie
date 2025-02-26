import { NodeProps } from 'reactflow';
import { BranchNodeConfig } from '../types/nodes';
import { BaseNode } from './BaseNode';


export const BranchNode = (props: NodeProps<BranchNodeConfig>) => {

	return (
		<BaseNode
			{...props}
			left={1}
			right={2}
		>
			<div className="flex flex-col gap-1">
				<div className="text-sm font-medium">条件分支</div>
			</div>
		</BaseNode>
	);
}; 