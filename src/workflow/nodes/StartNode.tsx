import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { TbPlus } from 'react-icons/tb';
import { NodeProps } from 'reactflow';
import { StartNodeConfig } from '../types/nodes';
import { BaseNode } from './BaseNode';
import { currentAction, WorkflowManager } from '../WorkflowManager';
import { cmd } from '@/utils/shell';


export const StartNode = (props: NodeProps<StartNodeConfig>) => {
	const [outputCount, setOutputCount] = useState(1);
	const start = currentAction.use(selector => selector.actions[props.id]);
	if (!start) {
		currentAction.set({
			actions: {
				...currentAction.current.actions,
				[props.id]: {
					id: props.id,
					type: 'start',
					inputs: {},
					outputs: {},
					startTime: new Date().toISOString(),
					status: 'pending',
					result: { success: false, data: null },
				},
			},
		});
	}
	const addInput = () => {
		console.log("addInput", start);
		const newInputs = { ...start.inputs, [`input${Object.keys(start.inputs).length + 1}`]: '' };
		console.log("newInputs", newInputs);
		currentAction.set((prev) => {
			return {
				...prev,
				actions: {
					...prev.actions,
					[props.id]: {
						...start,
						inputs: newInputs,
						outputs: newInputs
					}
				}
			}
		});
	};

	const removeInput = (key: string) => {
		const newInputs = { ...start.inputs };
		delete newInputs[key];
		currentAction.set({
			actions: {
				...currentAction.current.actions,
				[props.id]: {
					...start,
					inputs: newInputs,
					outputs: newInputs
				}
			}
		});
	};

	const updateInput = (key: string, value: string) => {
		const newInputs = { ...start.inputs };
		newInputs[key] = value;
		currentAction.set({
			actions: {
				...currentAction.current.actions,
				[props.id]: {
					...start,
					inputs: newInputs,
					outputs: newInputs
				}
			}
		});
	};

	return (
		<BaseNode
			{...props}
			left={0}
			right={outputCount}
		>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<div className="text-sm font-medium">{props.data.name || '开始节点'}</div>
					<Button variant="outline" size="sm" onClick={async () => {
						const workflow = WorkflowManager.get(currentAction.current.workflowId);
						const node = workflow?.nodes.find(node => node.id === props.id);
						if (workflow && node) {
							const result = await WorkflowManager.executeNode(workflow, node);
							console.log("result", result);
							cmd.message(JSON.stringify(result));
						}
					}}>
						运行
					</Button>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={() => setOutputCount(Math.max(1, outputCount - 1))}
							disabled={outputCount <= 1}
						>
							<Minus className="h-4 w-4" />
						</Button>
						<span className="text-sm">{outputCount}</span>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={() => setOutputCount(Math.min(5, outputCount + 1))}
							disabled={outputCount >= 5}
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					{Object.entries(start.inputs).map(([key, value]) => (
						<div key={key} className="flex items-center gap-2">
							<Input
								placeholder="参数名称"
								value={value}
								onChange={(e) => updateInput(key, e.target.value)}
								className="flex-1"
							/>
							<Button
								variant="ghost"
								size="icon"
								className="h-9 w-9"
								onClick={() => removeInput(key)}
							>
								<Minus className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>

				<Button variant="outline" size="sm" onClick={addInput}>
					<TbPlus className="h-4 w-4 mr-1" />
					添加输入参数
				</Button>
			</div>
		</BaseNode>
	);
}; 