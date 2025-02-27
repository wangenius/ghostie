import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Connection, EdgeChange, NodeChange, applyEdgeChanges, applyNodeChanges, addEdge, MarkerType } from 'reactflow';
import { WorkflowEdge } from '../types/edges';
import { NodeType, WorkflowNode } from '../types/nodes';
import { gen } from '@/utils/generator';
import { cmd } from '@/utils/shell';
import { WorkflowManager } from '../WorkflowManager';
import { CurrentActionState } from '../ActionManager';

const initialNodes: WorkflowNode[] = [
	{
		id: 'start',
		type: 'start',
		name: "开始",
		data: {
			type: 'start',
			name: "开始",
		},
		position: { x: 0, y: 0 },
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
		position: { x: 850, y: 0 },
	},
];

const initialEdges: WorkflowEdge[] = [];

const INITIAL_WORKFLOW = {
	id: "",
	name: "",
	description: ""
};

interface WorkflowContextType {
	nodes: WorkflowNode[];
	setNodes: (nodes: WorkflowNode[] | ((prev: WorkflowNode[]) => WorkflowNode[])) => void;
	updateNode: (id: string, nodeData: any) => void;
	edges: WorkflowEdge[];
	setEdges: (edges: WorkflowEdge[] | ((prev: WorkflowEdge[]) => WorkflowEdge[])) => void;
	workflow: typeof INITIAL_WORKFLOW;
	setWorkflow: (workflow: typeof INITIAL_WORKFLOW) => void;
	isExecuting: boolean;
	setIsExecuting: (isExecuting: boolean) => void;
	create: boolean;
	loading: boolean;
	resetWorkflow: () => void;
	onNodesChange: (changes: NodeChange[]) => void;
	onEdgesChange: (changes: EdgeChange[]) => void;
	onConnect: (params: Connection) => void;
	addNode: (type: NodeType, position: { x: number, y: number }) => void;
	executeWorkflow: () => Promise<void>;
	saveWorkflow: () => Promise<any>;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export const useWorkflow = () => {
	const context = useContext(WorkflowContext);
	if (!context) {
		throw new Error('useWorkflow must be used within a WorkflowProvider');
	}
	return context;
};

/* 工作流提供者 */
export const WorkflowProvider = ({
	children,
	queryId,
}: {
	children: React.ReactNode;
	queryId?: string | null;
}) => {
	/* 当前编辑器中的nodes */
	const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
	/* 当前编辑器中的edges */
	const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
	/* 当前编辑器中的workflow */
	const [workflow, setWorkflow] = useState(INITIAL_WORKFLOW);
	/* 是否正在执行 */
	const [isExecuting, setIsExecuting] = useState(false);
	/* 是否创建 */
	const [create, setCreate] = useState(true);
	/* 是否加载 */
	const [loading, setLoading] = useState(true);

	/* 重置工作流 */
	const resetWorkflow = useCallback(() => {
		setWorkflow(INITIAL_WORKFLOW);
		setNodes(initialNodes);
		setEdges(initialEdges);
		setCreate(true);
	}, []);

	/* 工作流列表 */
	const workflows = WorkflowManager.use();

	/* 加载工作流 */
	useEffect(() => {
		setLoading(true);
		if (queryId) {
			const existingWorkflow = workflows[queryId];
			if (existingWorkflow) {
				setCreate(false);
				setNodes(existingWorkflow.nodes);
				setEdges(existingWorkflow.edges);
				setWorkflow({
					id: existingWorkflow.id,
					name: existingWorkflow.name,
					description: existingWorkflow.description
				});

				const existingAction = CurrentActionState.current;
				if (!existingAction || existingAction.workflowId !== existingWorkflow.id) {
					CurrentActionState.set({
						...existingAction,
						id: existingAction?.id || gen.id(),
						workflowId: existingWorkflow.id,
						actions: existingAction?.actions || {},
						result: { success: false, data: null },
					});
				}
			} else {
				resetWorkflow();
			}
		} else {
			resetWorkflow();
		}
		setLoading(false);
	}, [queryId, resetWorkflow, workflows]);

	/* 节点变化 */
	const onNodesChange = useCallback((changes: NodeChange[]) => {
		setNodes((nds) => applyNodeChanges(changes, nds) as WorkflowNode[]);
	}, []);

	/* 边变化 */
	const onEdgesChange = useCallback((changes: EdgeChange[]) => {
		setEdges((eds) => applyEdgeChanges(changes, eds) as WorkflowEdge[]);
	}, []);

	/* 连接 */
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

	/* 添加节点 */
	const addNode = useCallback(
		(type: NodeType, position: { x: number, y: number }) => {
			const newNode: WorkflowNode = {
				id: gen.id(),
				type,
				name: type,
				position,
				data: {} as any
			};

			setNodes((nds) => [...nds, newNode]);
		},
		[]
	);

	/**
	 * 更新节点
	 * @param id 节点ID
	 * @param nodeData 节点数据, 支持部分更新
	 */
	const updateNode = useCallback((id: string, nodeData: any) => {
		setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...nodeData } } : n));
	}, []);

	/* 执行工作流 */
	const executeWorkflow = useCallback(async () => {
		try {
			if (!workflow.id) {
				cmd.message("执行失败", "工作流ID不能为空", "error");
				return;
			}

			CurrentActionState.set({
				...CurrentActionState.current,
				workflowId: workflow.id,
				actions: {
					...CurrentActionState.current.actions,
					end: {
						id: gen.id(),
						type: 'end',
						inputs: {},
						outputs: {},
						startTime: new Date().toISOString(),
						status: 'pending',
						result: { success: false, data: null },
					}
				},
				result: { success: false, data: null },
			});

			setIsExecuting(true);

			const existingAction = CurrentActionState.current;
			if (!existingAction || existingAction.workflowId !== workflow.id) {
				CurrentActionState.set({
					...existingAction,
					id: existingAction?.id || gen.id(),
					workflowId: workflow.id,
					actions: existingAction?.actions || {},
					result: { success: false, data: null },
				});
			}

			await WorkflowManager.exe();
		} catch (error) {
			console.error('工作流执行失败:', error);
		} finally {
			setIsExecuting(false);
		}
	}, [workflow]);

	/* 保存工作流 */
	const saveWorkflow = useCallback(async () => {
		if (!workflow.name) {
			cmd.message("保存失败", "工作流名称不能为空", "error");
			return;
		}
		const _id = workflow.id || gen.id();
		const savedWorkflow = WorkflowManager.save({
			id: _id,
			nodes,
			edges,
			name: workflow.name,
			description: workflow.description,
			createdAt: create ? new Date().toISOString() : WorkflowManager.state.current[_id].createdAt,
			updatedAt: new Date().toISOString(),
		});
		return {
			success: true,
			message: `工作流 ${savedWorkflow.name} 已${create ? '创建' : '更新'}`,
		}
	}, [nodes, edges, workflow, create]);

	/* 工作流上下文 */
	const value = {
		nodes,
		setNodes,
		updateNode,
		edges,
		setEdges,
		workflow,
		setWorkflow,
		isExecuting,
		setIsExecuting,
		create,
		loading,
		resetWorkflow,
		onNodesChange,
		onEdgesChange,
		onConnect,
		addNode,
		executeWorkflow,
		saveWorkflow,
	};

	return (
		<WorkflowContext.Provider value={value}>
			{children}
		</WorkflowContext.Provider>
	);
}; 