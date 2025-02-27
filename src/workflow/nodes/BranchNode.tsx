import { NodeProps } from 'reactflow';
import { BranchNodeConfig } from '../types/nodes';
import { NodePortal } from './NodePortal';


export const BranchNode = (props: NodeProps<BranchNodeConfig>) => {

	return (
		<NodePortal
			{...props}
			left={1}
			right={2}
		>
			<div className="flex flex-col gap-1">
				<div className="text-sm font-medium">条件分支</div>
			</div>
		</NodePortal>
	);
}; 