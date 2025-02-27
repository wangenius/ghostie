import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cmd } from '@/utils/shell';
import { Minus } from 'lucide-react';
import { TbPlayerPlay, TbPlus } from 'react-icons/tb';
import { NodeProps } from 'reactflow';
import { StartNodeConfig } from '../types/nodes';
import { CurrentActionState, WorkflowManager } from '../WorkflowManager';
import { NodePortal } from './NodePortal';


export const StartNode = (props: NodeProps<StartNodeConfig>) => {
	const start = CurrentActionState.use(selector => selector.actions[props.id]);
	if (!start) {
		CurrentActionState.set({
			actions: {
				...CurrentActionState.current.actions,
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
		CurrentActionState.set((prev) => {
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
		CurrentActionState.set({
			actions: {
				...CurrentActionState.current.actions,
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
		CurrentActionState.set({
			actions: {
				...CurrentActionState.current.actions,
				[props.id]: {
					...start,
					inputs: newInputs,
					outputs: newInputs
				}
			}
		});
	};

	return (
		<NodePortal
			{...props}
			left={0}
			right={1}
			header={
				<Button variant="outline" size="icon" onClick={async () => {
					const workflow = WorkflowManager.get(CurrentActionState.current.workflowId);
					const node = workflow?.nodes.find(node => node.id === props.id);
					if (workflow && node) {
						const result = await WorkflowManager.executeNode(workflow, node);
						console.log("result", result);
						cmd.message(JSON.stringify(result));
					}
				}}>
					<TbPlayerPlay className="w-4 h-4" />
				</Button>
			}
		>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">

				</div>

				<div className="flex flex-col gap-2">
					{Object.entries(start?.inputs || {}).map(([key, value]) => (
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
		</NodePortal>
	);
}; 