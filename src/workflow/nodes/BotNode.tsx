import { Bot } from '@/bot/Bot';
import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { BotNodeConfig } from '../types/nodes';
import { NodePortal } from './NodePortal';



export const BotNode = (props: NodeProps<BotNodeConfig>) => {

	const bot = useMemo(() => {
		return Bot.get(props.data.bot);
	}, [props.data.bot]);

	if (!bot) {
		return <div>机器人不存在</div>;
	}


	return (
		<NodePortal
			{...props}
			left={1}
			right={1}
		>
			<div className="text-sm font-medium">{bot.name}</div>
			{bot && (
				<div className="text-xs text-gray-500">
					<div>机器人: {bot.name}</div>
					{bot.tools.length > 0 && (
						<div>工具: {bot.tools.join(', ')}</div>
					)}
					{props.data.input && <div>输入: {props.data.input}</div>}
				</div>
			)}
		</NodePortal>
	);
}; 