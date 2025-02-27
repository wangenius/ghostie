import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@/hook/useQuery";
import { cmd } from "@/utils/shell";
import { Play } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { TbCheck } from "react-icons/tb";
import ReactFlow, {
	Background,
	Controls,
	ReactFlowProvider,
	SelectionMode,
	useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomEdge } from './components/CustomEdge';
import { useWorkflow, WorkflowProvider } from "./context/WorkflowContext";
import { BotNode } from "./nodes/BotNode";
import { BranchNode } from "./nodes/BranchNode";
import { ChatNode } from "./nodes/ChatNode";
import { EndNode } from "./nodes/EndNode";
import { PluginNode } from "./nodes/PluginNode";
import { StartNode } from "./nodes/StartNode";
import {
	NodeType
} from "./types/nodes";

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

/* 工作流表单组件 */
const WorkflowInfo = memo(() => {
	const { workflow, setWorkflow, saveWorkflow, executeWorkflow, isExecuting } = useWorkflow();
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
			saveWorkflow();
		}
	};


	useEffect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 's' && e.ctrlKey) {
				e.preventDefault();
				handleSave();
			}
		};
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	}, [handleSave]);


	return (
		<div className="flex items-center gap-4 px-3 bg-card">
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
					<TbCheck className="w-4 h-4" />
					保存
				</Button>
				<Button
					onClick={executeWorkflow}
					disabled={isExecuting}
					size="sm"
					className="h-8"
				>
					<Play className="w-4 h-4" />
					{isExecuting ? '执行中...' : '执行'}
				</Button>
			</div>
		</div>
	);
});

/* 工作流图组件 */
const WorkflowGraph = memo(() => {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useWorkflow();
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
										addNode(type as NodeType, menu.flowPosition);
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

/* 工作流编辑器 */
export const WorkflowEditor = () => {
	/* 查询参数 */
	const queryId = useQuery('id');
	return (
		<WorkflowProvider queryId={queryId}>
			<div className="flex flex-col h-screen">
				<Header title={"编辑工作流"} />
				<div className="flex-1 flex flex-col">
					<WorkflowInfo />
					<ReactFlowProvider>
						<WorkflowGraph />
					</ReactFlowProvider>
				</div>
			</div>
		</WorkflowProvider>
	);
};

WorkflowEditor.open = (id: string = "new") => {
	cmd.open("workflow-edit", { id }, { width: 1000, height: 600 });
};