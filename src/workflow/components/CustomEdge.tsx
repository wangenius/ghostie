import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';
import { WorkflowEdgeData } from '../types/edges';

// 自定义边缘组件，用于正确处理多个连接点的情况
export const CustomEdge = (props: EdgeProps<WorkflowEdgeData>) => {
	const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;

	const [edgePath] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	return (
		<>
			<BaseEdge
				id={props.id}
				path={edgePath}
				markerEnd={props.markerEnd}
				style={{
					strokeWidth: 2
				}}
			/>
			{props.data && (
				<text>
					<textPath
						href={`#${props.id}`}
						style={{ fontSize: 12 }}
						startOffset="50%"
						textAnchor="middle"
					>
						{`${props.data.sourceHandle} -> ${props.data.targetHandle}`}
					</textPath>
				</text>
			)}
		</>
	);
}; 