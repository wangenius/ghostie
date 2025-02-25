import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { useCallback, useState } from "react";
import { TbPlus } from "react-icons/tb";
import ReactFlow, {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	Background,
	Connection,
	Controls,
	EdgeChange,
	MarkerType,
	NodeChange,
	SelectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import { EndNode } from "./nodes/EndNode";
import { BotNode } from "./nodes/BotNode";
import { BranchNode } from "./nodes/BranchNode";
import { ChatNode } from "./nodes/ChatNode";
import { PluginNode } from "./nodes/PluginNode";
import { WorkflowEdge } from "./types/edges";
import { NodeType, WorkflowNode } from "./types/nodes";
import { WorkflowExecutor } from "./WorkflowExecutor";
import { StartNode } from "./nodes/StartNode";
import { CustomEdge } from './components/CustomEdge';

const nodeTypes = {
	start: StartNode,
	end: EndNode,
	chat: ChatNode,
	bot: BotNode,
	plugin: PluginNode,
	branch: BranchNode,
};

const edgeTypes = {
	default: CustomEdge,
};

const NODE_TYPES: Record<NodeType, { label: string }> = {
	start: { label: '开始' },
	end: { label: '结束' },
	chat: { label: '对话' },
	bot: { label: '机器人' },
	plugin: { label: '插件' },
	condition: { label: '条件' },
	branch: { label: '分支' },
};

const initialNodes: WorkflowNode[] = [
	{
		id: 'start',
		type: 'start',
		name: "开始",
		data: {
			type: 'start',
			name: "开始",
		},
		position: { x: 250, y: 25 },
	},
	{
		id: 'end',
		type: 'end',
		name: "结束",
		data: {
			type: 'end',
			name: "结束",
		},
		position: { x: 250, y: 400 },
	},
];

const initialEdges: WorkflowEdge[] = [];

const addNodeValidators = (node: WorkflowNode): WorkflowNode => {
	if (node.data.type === 'start' || node.data.type === 'end') {
		return node;
	}

	return {
		...node,
		data: {
			...node.data
		},
	};
};

export const WorkflowEditor = () => {
	const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
	const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
	const [isExecuting, setIsExecuting] = useState(false);

	const onNodesChange = useCallback((changes: NodeChange[]) => {
		setNodes((nds) => applyNodeChanges(changes, nds) as WorkflowNode[]);
	}, []);

	const onEdgesChange = useCallback((changes: EdgeChange[]) => {
		setEdges((eds) => applyEdgeChanges(changes, eds) as WorkflowEdge[]);
	}, []);

	const onConnect = useCallback((params: Connection) => {
		console.log('Connection params:', params);
		const sourceId = params.sourceHandle || '';
		const targetId = params.targetHandle || '';

		if (!sourceId || !targetId) {
			console.warn('无法创建连接：缺少源或目标连接点ID');
			return;
		}

		setEdges((eds) =>
			addEdge(
				{
					...params,
					type: 'default',
					markerEnd: { type: MarkerType.ArrowClosed },
					data: {
						type: 'default',
						sourceHandle: sourceId,
						targetHandle: targetId,
					}
				},
				eds
			) as WorkflowEdge[]
		);
	}, []);

	const addNode = useCallback(
		(type: NodeType) => {
			if (type === 'start' || type === 'end') return;

			const newNode = addNodeValidators({
				id: gen.id(),
				name: NODE_TYPES[type].label,
				type,
				data: {},
				position: { x: 250, y: nodes.length * 100 },
			});

			setNodes((nds) => [...nds, newNode]);
		},
		[nodes.length]
	);

	const executeWorkflow = useCallback(async () => {
		// 验证所有节点
		const invalidNodes = nodes.filter((node) => {
			if (node.data.type === 'start' || node.data.type === 'end') return false;
			if (!node.data.validate?.()) {
				return true;
			}
			return false;
		});

		if (invalidNodes.length > 0) {
			cmd.message("工作流验证失败", `以下节点配置无效：${invalidNodes.map(n => n.data.label).join(', ')}`, "error");
			return;
		}

		setIsExecuting(true);
		try {
			const executor = new WorkflowExecutor(nodes, edges);
			const result = await executor.execute();
			console.log('Workflow execution result:', result);
			cmd.message("工作流执行成功", "查看控制台获取详细结果", "info");
		} catch (error) {
			console.error('Workflow execution failed:', error);
			cmd.message("工作流执行失败", String(error), "error");
		} finally {
			setIsExecuting(false);
		}
	}, [nodes, edges]);

	const saveWorkflow = useCallback(() => {
		// TODO: Implement workflow saving logic
		console.log('Saving workflow:', { nodes, edges });
	}, [nodes, edges]);

	return (
		<div className="flex flex-col h-screen">
			<Header title="工作流编辑" />
			<div className="flex-1 flex flex-col">
				<div className="flex items-center justify-between p-4 border-b">
					<div className="flex items-center gap-2">
						<Button onClick={saveWorkflow}>保存</Button>
						<Button
							onClick={executeWorkflow}
							disabled={isExecuting}
							variant="secondary"
						>
							{isExecuting ? '执行中...' : '执行'}
						</Button>
						{Object.entries(NODE_TYPES)
							.filter(([type]) => type !== 'start' && type !== 'end')
							.map(([type, { label }]) => (
								<Button
									key={type}
									variant="outline"
									size="sm"
									onClick={() => addNode(type as NodeType)}
								>
									<TbPlus className="w-4 h-4 mr-1" />
									{label}
								</Button>
							))}
					</div>
				</div>
				<div className="flex-1">
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onEdgeContextMenu={() => { }}
						onPaneClick={() => { }}
						nodeTypes={nodeTypes}
						edgeTypes={edgeTypes}
						fitView
						className="bg-background"
						minZoom={0.1}
						maxZoom={10}
						defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
						onNodeContextMenu={(event) => event.preventDefault()}
						nodesConnectable={true}
						zoomOnScroll={true}
						panOnScroll={false}
						panOnDrag={[1, 2]}
						selectionOnDrag={true}
						selectNodesOnDrag={true}
						preventScrolling={true}
						selectionMode={SelectionMode.Partial}
					>
						<Background />
						<Controls />
					</ReactFlow>
				</div>
			</div>
		</div>
	);
};

WorkflowEditor.open = (id?: string) => {
	cmd.open("workflow-edit", { id }, { width: 1000, height: 600 });
}; 