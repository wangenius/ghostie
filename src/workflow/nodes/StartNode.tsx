import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { TbPlus } from 'react-icons/tb';
import { NodeProps } from 'reactflow';
import { StartNodeConfig } from '../types/nodes';
import { BaseNode } from './BaseNode';

export const StartNode = (props: NodeProps<StartNodeConfig>) => {
	const [outputCount, setOutputCount] = useState(1);
	const [inputs, setInputs] = useState<string>('');
	const addOutput = () => {
		setOutputCount(prev => Math.min(prev + 1, 5));
	};
	const removeOutput = () => {
		setOutputCount(prev => Math.max(prev - 1, 1));
	};
	return (
		<BaseNode
			{...props}
			left={0}
			right={outputCount}
		>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<div className="text-sm font-medium">{props.data.name}</div>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={removeOutput}
							disabled={outputCount <= 1}
						>
							<Minus className="h-4 w-4" />
						</Button>
						<span className="text-sm">{outputCount}</span>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={addOutput}
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<Input
					placeholder="输入名称"
					value={inputs}
					onChange={(e) => setInputs(e.target.value)}
				/>
				<Button
					variant="outline"
					size="sm"
					className="w-full"
					onClick={addOutput}
					disabled={outputCount >= 5}
				>
					<TbPlus className="h-4 w-4 mr-1" />
					添加
				</Button>
			</div>
		</BaseNode>
	);
}; 