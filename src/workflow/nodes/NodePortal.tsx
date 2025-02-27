import { cn } from "@/lib/utils"
import React, { useEffect } from "react"
import { NodeProps, Position, useUpdateNodeInternals } from "reactflow"
import CustomHandle from "../components/CustomHandle"

const co = 40;

type NodeVariant = "default" | 'chat' | 'bot' | "plugin" | 'condition' | 'branch';

interface BaseNodeProps extends NodeProps {
	children: React.ReactNode;
	left: number;
	right: number;
	variant?: NodeVariant;
	state?: "idle" | "pending" | "running" | "completed" | "failed";
	title?: string;
	header?: React.ReactNode;
}

const variants: Record<NodeVariant, string> = {
	default: 'bg-muted border-muted-foreground/20',
	chat: 'bg-blue-50 border-blue-200',
	bot: 'bg-green-50 border-green-200',
	plugin: 'bg-purple-50 border-purple-200',
	condition: 'bg-red-50 border-red-200',
	branch: 'bg-orange-50 border-orange-200'
};




/* 基础节点组件*/
export const NodePortal = ({
	children,
	selected,
	isConnectable,
	left,
	right,
	id,
	data,
	variant = 'default',
	state = 'idle',
	title,
	header
}: BaseNodeProps) => {
	const updateNodeInternals = useUpdateNodeInternals();
	useEffect(() => {
		updateNodeInternals(id);
	}, [id, data, left, right, updateNodeInternals]);

	return (
		<div
			onClick={(e) => {
				e.stopPropagation();
			}}
			onDoubleClick={(e) => {
				e.stopPropagation();
				e.preventDefault();
			}}
			style={{
				minHeight: 120,
			}}
			className={cn(
				// 基础样式
				'transition-all duration-200 border p-2 rounded-lg w-[240px] h-auto',
				// 变体样式
				variants[variant],
				// 选中样式
				selected && 'ring-2 ring-primary/40',
				// 禁用样式
				!isConnectable && 'opacity-60 cursor-not-allowed'
			)}>

			<div className="flex items-center justify-between h-8 px-1">
				<div className="text-sm font-bold">
					{title || variant}
				</div>
				{header && (
					<div className="text-sm font-medium">
						{header}
					</div>
				)}
			</div>



			{/* 内容区域 */}
			<div className={cn(
				'relative z-10 nowheel nopan nodrag cursor-default',
			)}>
				{children}
			</div>
			{/* 左侧连接点 */}
			{Array.from({ length: left || 0 }).map((_, index) => (
				<CustomHandle
					key={`left-${index}`}
					type="target"
					id={`${index}`}
					position={Position.Left}
					isConnectable={isConnectable}
					style={{
						top: index * co + co,
						opacity: state === 'failed' ? 0.5 : 1
					}}
					className={cn(
						state === 'completed' && 'bg-green-500',
						state === 'failed' && 'bg-red-500',
						state === 'running' && 'bg-blue-500'
					)}
				/>
			))}

			{/* 右侧连接点 */}
			{Array.from({ length: right || 0 }).map((_, index) => (
				<CustomHandle
					key={`right-${index}`}
					type="source"
					id={`${index}`}
					position={Position.Right}
					isConnectable={isConnectable}
					style={{
						top: index * co + co,
						opacity: state === 'failed' ? 0.5 : 1
					}}
					className={cn(
						state === 'completed' && 'bg-green-500',
						state === 'failed' && 'bg-red-500',
						state === 'running' && 'bg-blue-500'
					)}
				/>
			))}
		</div>
	)
}

