import { NodeProps } from 'reactflow';
import { ChatNodeConfig } from '../types/nodes';
import { BaseNode } from './BaseNode';


export const ChatNode = (props: NodeProps<ChatNodeConfig>) => {
	const { data } = props;
	return (
		<BaseNode
			{...props}
			left={1}
			right={1}
		>



			<div className="flex flex-col gap-1">
				<div className="text-sm font-medium">Chat</div>
				{data && (
					<div className="text-xs text-gray-500">
						<div>模型: {data.model}</div>
						{data.system && <div>系统提示: {data.system}</div>}
						{data.user && <div>用户输入: {data.user}</div>}
						{data.temperature && <div>温度: {data.temperature}</div>}
					</div>
				)}
			</div>


		</BaseNode>
	);
}; 