import { cn } from "@/lib/utils"
import React, { useEffect } from "react"
import { NodeProps, Position } from "reactflow"
import CustomHandle from "../components/CustomHandle"
import { useUpdateNodeInternals } from "reactflow"
import { max } from "lodash";

const co = 40;

type NodeVariant = 'default' | 'primary' | 'secondary' | 'ghost';
type NodeState = 'idle' | 'pending' | 'running' | 'completed' | 'failed';
type NodeSize = 'sm' | 'md' | 'lg';
type NodeShape = 'start' | 'end' | 'process' | 'condition' | 'plugin';

interface BaseNodeProps extends NodeProps {
	children: React.ReactNode;
	left: number;
	right: number;
	variant?: NodeVariant;
	state?: NodeState;
	size?: NodeSize;
	shape?: NodeShape;
}

const getNodeStateStyles = (state: NodeState = 'idle') => {
	const states: Record<NodeState, string> = {
		idle: 'bg-muted hover:bg-muted/80',
		pending: 'bg-yellow-50 border-yellow-200',
		running: 'bg-blue-50 border-blue-200 animate-pulse',
		completed: 'bg-green-50 border-green-200',
		failed: 'bg-red-50 border-red-200'
	};
	return states[state];
};

const getNodeVariantStyles = (variant: NodeVariant = 'default') => {
	const variants: Record<NodeVariant, string> = {
		default: 'border-gray-200',
		primary: 'border-primary/30 shadow-sm',
		secondary: 'border-secondary/30 bg-secondary/5',
		ghost: 'border-transparent bg-transparent'
	};
	return variants[variant];
};

const getNodeSizeStyles = (size: NodeSize = 'md') => {
	const sizes: Record<NodeSize, string> = {
		sm: 'min-w-[160px] p-2',
		md: 'min-w-[200px] p-3',
		lg: 'min-w-[280px] p-4'
	};
	return sizes[size];
};

const getNodeShapeStyles = (shape: NodeShape = 'process') => {
	const shapes: Record<NodeShape, string> = {
		start: 'rounded-lg',
		end: 'rounded-lg',
		process: 'rounded-lg',
		condition: 'rounded-lg',
		plugin: 'rounded-lg'
	};
	return shapes[shape];
};

/* 基础节点组件*/
export const BaseNode = ({
	children,
	selected,
	isConnectable,
	left,
	right,
	id,
	data,
	variant = 'default',
	state = 'idle',
	size = 'md',
	shape = 'process',
	...props
}: BaseNodeProps) => {
	const updateNodeInternals = useUpdateNodeInternals();
	const handles = Array.from(
		{
			length: (max([left, right]) || 0) + 1,
		},
		(_, i) => i,
	);

	useEffect(() => {
		updateNodeInternals(id);
	}, [id, data, left, right, updateNodeInternals]);

	return (
		<div
			{...props}
			style={{
				height: handles.length * 14 + 80,
				minHeight: 120,
			}}
			className={cn(
				// 基础样式
				'transition-all duration-200 border',
				// 变体样式
				getNodeVariantStyles(variant),
				// 状态样式
				getNodeStateStyles(state),
				// 尺寸样式
				getNodeSizeStyles(size),
				// 形状样式
				getNodeShapeStyles(shape),
				// 选中样式
				selected && 'ring-2 ring-primary/40',
				// 禁用样式
				!isConnectable && 'opacity-60 cursor-not-allowed'
			)}>
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

			{/* 内容区域 */}
			<div className={cn(
				'relative z-10',
				size === 'sm' && 'space-y-1',
				size === 'md' && 'space-y-2',
				size === 'lg' && 'space-y-3'
			)}>
				{children}
			</div>

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

