import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@/hook/useQuery";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { memo, useCallback, useEffect, useRef, useState } from "react";
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
	ReactFlowProvider,
	SelectionMode,
	useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomEdge } from './components/CustomEdge';
import { BotNode } from "./nodes/BotNode";
import { BranchNode } from "./nodes/BranchNode";
import { ChatNode } from "./nodes/ChatNode";
import { EndNode } from "./nodes/EndNode";
import { PluginNode } from "./nodes/PluginNode";
import { StartNode } from "./nodes/StartNode";
import { WorkflowEdge } from "./types/edges";
import { NodeConfig, NodeExecuteResult, NodeType, WorkflowNode } from "./types/nodes";
import { WorkflowExecuteContext, WorkflowManager } from "./WorkflowManager";

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
			result: ''
		},
		position: { x: 250, y: 400 },
	},
];

const initialEdges: WorkflowEdge[] = [];

const INITIAL_WORKFLOW = {
	name: "",
	description: ""
};


const useWorkflowState = (queryId?: string) => {
	const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
	const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
	const [workflow, setWorkflow] = useState(INITIAL_WORKFLOW);
	const [isExecuting, setIsExecuting] = useState(false);
	const [create, setCreate] = useState(true);
	const [loading, setLoading] = useState(true);

	const resetWorkflow = useCallback(() => {
		setWorkflow(INITIAL_WORKFLOW);
		setNodes(initialNodes);
		setEdges(initialEdges);
		setCreate(true);
	}, []);

	useEffect(() => {
		setLoading(true);
		if (queryId) {
			const existingWorkflow = WorkflowManager.get(queryId);
			if (existingWorkflow) {
				setCreate(false);
				setNodes(existingWorkflow.nodes);
				setEdges(existingWorkflow.edges);
				setWorkflow({
					name: existingWorkflow.name,
					description: existingWorkflow.description
				});
			} else {
				resetWorkflow();
			}
		} else {
			resetWorkflow();
		}
		setLoading(false);
	}, [queryId, resetWorkflow]);

	return {
		nodes,
		setNodes,
		edges,
		setEdges,
		workflow,
		setWorkflow,
		isExecuting,
		setIsExecuting,
		create,
		loading,
		resetWorkflow
	};
};

// 提取工作流表单组件
const WorkflowForm = memo(({
	workflow,
	setWorkflow,
	onSave,
	onExecute,
	isExecuting,
}: {
	workflow: { name: string; description: string };
	setWorkflow: (workflow: { name: string; description: string }) => void;
	onSave: () => void;
	onExecute: () => void;
	isExecuting: boolean;
	onAddNode: (type: NodeType, position: { x: number, y: number }) => void;
}) => {
	const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

	const handleSave = () => {
		const newErrors: { name?: string; description?: string } = {};
		if (!workflow.name.trim()) {
			newErrors.name = "工作流名称不能为空";
		}
		if (!workflow.description.trim()) {
			newErrors.description = "工作流描述不能为空";
		}

		setErrors(newErrors);
		if (Object.keys(newErrors).length === 0) {
			onSave();
		}
	};

	return (
		<div className="flex items-center gap-4 p-3 border-b bg-card">
			{/* 工作流信息 */}
			<div className="flex-1 grid grid-cols-[1fr,1.5fr] gap-3">
				<Input
					value={workflow.name}
					onChange={(e) => {
						setWorkflow({ ...workflow, name: e.target.value });
						setErrors({ ...errors, name: undefined });
					}}
					placeholder="工作流名称"
					className={`h-8 ${errors.name ? 'border-red-500' : ''}`}
				/>
				<Input
					value={workflow.description}
					onChange={(e) => {
						setWorkflow({ ...workflow, description: e.target.value });
						setErrors({ ...errors, description: undefined });
					}}
					placeholder="工作流描述"
					className={`h-8 ${errors.description ? 'border-red-500' : ''}`}
				/>
			</div>

			{/* 操作按钮 */}
			<div className="flex items-center gap-2">
				<Button
					onClick={handleSave}
					size="sm"
					variant="secondary"
					className="h-8"
				>
					保存
				</Button>
				<Button
					onClick={onExecute}
					disabled={isExecuting}
					size="sm"
					className="h-8"
				>
					{isExecuting ? '执行中...' : '执行'}
				</Button>
			</div>
		</div>
	);
});

// 提取工作流图组件
const WorkflowGraph = memo(({
	nodes,
	edges,
	onNodesChange,
	onEdgesChange,
	onConnect,
	onAddNode
}: {
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	onNodesChange: (changes: NodeChange[]) => void;
	onEdgesChange: (changes: EdgeChange[]) => void;
	onConnect: (params: Connection) => void;
	onAddNode: (type: NodeType, position: { x: number, y: number }) => void;
}) => {
	const [menu, setMenu] = useState<{
		x: number;
		y: number;
		flowPosition?: { x: number; y: number };
	} | null>(null);

	const reactFlowWrapper = useRef<HTMLDivElement>(null);
	const { project } = useReactFlow();

	const showMenu = useCallback((event: React.MouseEvent) => {
		event.preventDefault();

		if (reactFlowWrapper.current) {
			const rect = reactFlowWrapper.current.getBoundingClientRect();
			const flowPosition = project({
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			});

			setMenu({
				x: event.clientX,
				y: event.clientY,
				flowPosition,
			});
		}
	}, [project]);

	const closeMenu = useCallback(() => {
		setMenu(null);
	}, []);

	return (
		<div ref={reactFlowWrapper} className="w-full h-full">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onEdgeContextMenu={() => { }}
				onPaneContextMenu={showMenu}
				onDoubleClick={showMenu}
				onClick={closeMenu}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				fitView
				className="w-full h-full bg-background"
				minZoom={0.1}
				maxZoom={10}
				defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
				zoomOnDoubleClick={false}
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

			{menu && (
				<div
					className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
					style={{
						top: menu.y,
						left: menu.x,
					}}
				>
					<div className="text-xs font-medium text-muted-foreground px-2 py-1.5">添加节点</div>
					{Object.entries(NODE_TYPES)
						.filter(([type]) => type !== 'start' && type !== 'end')
						.map(([type, { label }]) => (
							<button
								key={type}
								className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
								onClick={() => {
									if (menu.flowPosition) {
										onAddNode(type as NodeType, menu.flowPosition);
									}
									closeMenu();
								}}
							>
								{label}
							</button>
						))}
				</div>
			)}
		</div>
	);
});

// 包装 ReactFlow 的组件
const ReactFlowWrapper = memo(({
	nodes,
	edges,
	onNodesChange,
	onEdgesChange,
	onConnect,
	onAddNode
}: {
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	onNodesChange: (changes: NodeChange[]) => void;
	onEdgesChange: (changes: EdgeChange[]) => void;
	onConnect: (params: Connection) => void;
	onAddNode: (type: NodeType, position: { x: number, y: number }) => void;
}) => {
	return (
		<ReactFlowProvider>
			<div className="w-full h-full">
				<WorkflowGraph
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onAddNode={onAddNode}
				/>
			</div>
		</ReactFlowProvider>
	);
});

// 主组件
export const WorkflowEditor = () => {
	const queryId = useQuery('id');
	const id = queryId || undefined;

	const {
		nodes,
		setNodes,
		edges,
		setEdges,
		workflow,
		setWorkflow,
		isExecuting,
		setIsExecuting,
		create,
		loading,
		resetWorkflow
	} = useWorkflowState(id);

	const handleClose = useCallback(() => {
		cmd.close();
		resetWorkflow();
	}, [resetWorkflow]);



	const onNodesChange = useCallback((changes: NodeChange[]) => {
		setNodes((nds) => applyNodeChanges(changes, nds) as WorkflowNode[]);
	}, []);

	const onEdgesChange = useCallback((changes: EdgeChange[]) => {
		setEdges((eds) => applyEdgeChanges(changes, eds) as WorkflowEdge[]);
	}, []);

	const onConnect = useCallback((params: Connection) => {
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
		(type: NodeType, position: { x: number, y: number }) => {
			let nodeConfig: NodeConfig;

			switch (type) {
				case 'start':
					nodeConfig = {
						type: 'start',
						name: NODE_TYPES[type].label,
					};
					break;
				case 'end':
					nodeConfig = {
						type: 'end',
						name: NODE_TYPES[type].label,
						result: ''
					};
					break;
				case 'chat':
					nodeConfig = {
						type: 'chat',
						name: NODE_TYPES[type].label,
						system: '',
						user: '',
						temperature: 0.7,
						model: ''
					};
					break;
				case 'bot':
					nodeConfig = {
						type: 'bot',
						name: NODE_TYPES[type].label,
						bot: ''
					};
					break;
				case 'plugin':
					nodeConfig = {
						type: 'plugin',
						name: NODE_TYPES[type].label,
						plugin: '',
						tool: ''
					};
					break;
				case 'condition':
					nodeConfig = {
						type: 'condition',
						name: NODE_TYPES[type].label,
						expression: ''
					};
					break;
				case 'branch':
					nodeConfig = {
						type: 'branch',
						name: NODE_TYPES[type].label,
						conditions: []
					};
					break;
			}

			const newNode: WorkflowNode = {
				id: gen.id(),
				type,
				name: NODE_TYPES[type].label,
				position,
				data: nodeConfig,
			};

			setNodes((nds) => [...nds, newNode]);
		},
		[]
	);

	const executeWorkflow = useCallback(async () => {
		setIsExecuting(true);
		try {
			if (!id) {
				cmd.message("执行失败", "工作流ID不能为空", "error");
				return;
			}
			const context: WorkflowExecuteContext = {
				id: gen.id(),
				workflowId: id,
				actions: {},
				result: null
			};

			const result: NodeExecuteResult = await WorkflowManager.executeWorkflow(context);

			// 更新 End 节点显示结果
			setNodes(nodes => nodes.map(node => {
				if (node.type === 'end') {
					return {
						...node,
						data: {
							...node.data,
							result: result.success ? String(result.data) : result.error || '执行失败'
						}
					};
				}
				return node;
			}));

			console.log('工作流执行结果:', result);
			cmd.message("工作流执行成功", "查看控制台获取详细结果", "info");
		} catch (error) {
			console.error('工作流执行失败:', error);
			cmd.message("工作流执行失败", String(error), "error");
		} finally {
			setIsExecuting(false);
		}
	}, [nodes, edges, workflow.name, workflow.description, id]);

	const saveWorkflow = useCallback(async () => {
		if (!workflow.name) {
			cmd.message("保存失败", "工作流名称不能为空", "error");
			return;
		}

		const savedWorkflow = WorkflowManager.save({
			id,
			nodes,
			edges,
			name: workflow.name,
			description: workflow.description
		});

		cmd.message("保存成功", `工作流 ${savedWorkflow.name} 已${create ? '创建' : '更新'}`, "info");
		await handleClose();
	}, [nodes, edges, id, workflow.name, workflow.description, create, handleClose]);

	if (loading) {
		return (
			<div className="flex flex-col h-screen bg-background">
				<Header title={create ? "新建工作流" : "编辑工作流"} close={handleClose} />
				<div className="flex-1 flex items-center justify-center">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen">
			<Header title={create ? "新建工作流" : "编辑工作流"} close={handleClose} />
			<div className="flex-1 flex flex-col">
				<WorkflowForm
					workflow={workflow}
					setWorkflow={setWorkflow}
					onSave={saveWorkflow}
					onExecute={executeWorkflow}
					isExecuting={isExecuting}
					onAddNode={addNode}
				/>
				<div className="flex-1 relative">
					<ReactFlowWrapper
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onAddNode={addNode}
					/>
				</div>
			</div>
		</div>
	);
};

WorkflowEditor.open = (id?: string) => {
	cmd.open("workflow-edit", { id }, { width: 1000, height: 600 });
}; 