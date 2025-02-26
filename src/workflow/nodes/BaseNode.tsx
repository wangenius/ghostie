import { cn } from "@/lib/utils"
import React, { useEffect } from "react"
import { NodeProps, Position } from "reactflow"
import CustomHandle from "../components/CustomHandle"
import { useUpdateNodeInternals } from "reactflow"
import { max } from "lodash";
const co = 40;

/* 基础节点组件*/
export const BaseNode = (props: NodeProps & {
	children: React.ReactNode;
	left: number;
	right: number;
}) => {
	const { children, selected, isConnectable, left, right, id, data } = props;
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
			style={{
				height: handles.length * 14 + 80,
				minHeight: 120,
			}}
			className={cn(
				'px-4 py-2 rounded-lg bg-muted min-w-[200px]',
				selected && `ring-2 ring-primary/40`
			)}>
			{Array.from({ length: left || 0 }).map((_, index) => {
				return (
					<CustomHandle
						key={index}
						type="target"
						id={`${index}`}
						position={Position.Left}
						isConnectable={isConnectable}
						style={{ top: index * co + co }}
					/>
				) as React.ReactNode;
			})}
			{children}
			{Array.from({ length: right || 0 }).map((_, index) => {
				return (
					<CustomHandle
						key={index}
						type="source"
						id={`${index}`}
						position={Position.Right}
						isConnectable={isConnectable}
						style={{ top: index * co + co }}
					/>
				) as React.ReactNode;
			})}
		</div>
	)
}

