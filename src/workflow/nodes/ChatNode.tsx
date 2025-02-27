import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ModelManager } from '@/model/ModelManager';
import { useState } from 'react';
import { NodeProps } from 'reactflow';
import { useWorkflow } from '../context/WorkflowContext';
import { ChatNodeConfig } from '../types/nodes';
import { NodePortal } from './NodePortal';
import { Label } from '@/components/ui/label';

export const ChatNode = (props: NodeProps<ChatNodeConfig>) => {
	const models = ModelManager.use();
	const { updateNode } = useWorkflow();
	const [system, setSystem] = useState(props.data.system);

	return (
		<NodePortal
			{...props}
			left={1}
			right={1}
			variant="chat"
			title="对话"
		>
			<div className="flex flex-col gap-1">
				<Select value={props.data.model}
					onValueChange={(value) => {
						updateNode(props.id, {
							model: value
						});
					}}
				>
					<SelectTrigger variant='ghost'>
						<SelectValue placeholder="选择模型" />
					</SelectTrigger>
					<SelectContent>
						{
							Object.values(models).map(model => (
								<SelectItem key={model.id} value={model.id}>
									{model.name}
								</SelectItem>
							))
						}
					</SelectContent>
				</Select>
				<Label>系统提示词</Label>
				<Textarea
					variant='ghost'
					className='text-xs'
					value={system}
					onChange={(e) => {
						setSystem(e.target.value);
						updateNode(props.id, {
							system: e.target.value
						});
					}}
					placeholder="系统提示词"
				/>
			</div>
		</NodePortal>
	);
};

