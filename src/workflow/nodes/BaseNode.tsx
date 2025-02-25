import { cn } from "@/lib/utils"
import React, { useEffect } from "react"
import { NodeProps, Position } from "reactflow"
import CustomHandle from "../components/CustomHandle"
import { useUpdateNodeInternals } from "reactflow"
const co = 40;

export const BaseNode = ({ children, selected, isConnectable, left, right, id, data }: NodeProps & {
	children: React.ReactNode;
	left: number;
	right: number;
}) => {
	const updateNodeInternals = useUpdateNodeInternals();


	useEffect(() => {
		updateNodeInternals(id);
	}, [id, data, updateNodeInternals]);

	return (
		<div
			className={cn(
				'px-4 py-2 rounded-lg bg-muted min-w-[200px]',
				selected && 'shadow-md'
			)}>
			{Array.from({ length: left || 0 }).map((_, index) => {
				return (
					<CustomHandle
						key={`${index}`}
						type="target"
						id={`${index}`}
						position={Position.Left}
						isConnectable={isConnectable}
						style={{ top: index * co + co }}
						className={`!absolute !w-3 !h-3 !border-2 !rounded-full !cursor-pointer z-10 
							transition-all duration-300 hover:!bg-primary/50
							translate-x-0.5 !bg-muted-foreground !border-primary`}
					/>
				) as React.ReactNode;
			})}
			{children}
			{Array.from({ length: right || 0 }).map((_, index) => {
				return (
					<CustomHandle
						key={`${index}`}
						type="source"
						id={`${index}`}
						position={Position.Right}
						isConnectable={isConnectable}
						style={{ top: index * co + co }}
						className={`!absolute !w-3 !h-3 !border-2 !rounded-full !cursor-pointer z-10 
							transition-all duration-300 hover:!bg-primary/50
							translate-x-0.5 !bg-muted-foreground !border-primary`}
					/>
				) as React.ReactNode;
			})}
		</div>
	)
}

