import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@/hook/useQuery";
import { cmd } from "@/utils/shell";
import { Play } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { CustomEdge } from "./components/CustomEdge";
import { BotNode } from "./nodes/BotNode";
import { BranchNode } from "./nodes/BranchNode";
import { ChatNode } from "./nodes/ChatNode";
import { EndNode } from "./nodes/EndNode";
import { FilterNode } from "./nodes/FilterNode";
import { PluginNode } from "./nodes/PluginNode";
import { StartNode } from "./nodes/StartNode";
import { NodeType } from "./types/nodes";
import { Workflow } from "./Workflow";
import { useNodes } from "./hooks/useNodes";
import { useEdges } from "./hooks/useEdges";
import { ContextMenu } from "./components/ContextMenu";
import { FLOW_CONFIG } from "./constants";

/* 节点类型 */
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  chat: ChatNode,
  bot: BotNode,
  plugin: PluginNode,
  branch: BranchNode,
  filter: FilterNode,
} as const;

/* 边类型 */
const edgeTypes = {
  default: CustomEdge,
};

/* 当前编辑的工作流 */
export const EditorWorkflow = new Workflow();

/* 工作流表单组件 */
const WorkflowInfo = memo(() => {
  const workflow = EditorWorkflow.use();

  return (
    <div className="flex items-center gap-4 px-3 bg-card">
      <div className="flex-1 grid grid-cols-[1fr,1.5fr] gap-3">
        <Input
          value={workflow?.data.name}
          onChange={(e) => {
            EditorWorkflow.set((state) => ({
              ...state,
              data: {
                ...state.data,
                name: e.target.value,
              },
            }));
          }}
          placeholder="工作流名称"
        />
        <Input
          value={workflow?.data.description}
          onChange={(e) => {
            EditorWorkflow.set((state) => ({
              ...state,
              data: {
                ...state.data,
                description: e.target.value,
              },
            }));
          }}
          placeholder="工作流描述"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => EditorWorkflow.execute()}
          disabled={workflow?.isExecuting}
          size="sm"
          className="h-8"
        >
          <Play className="w-4 h-4" />
          {workflow?.isExecuting ? "执行中..." : "执行"}
        </Button>
      </div>
    </div>
  );
});

/* 工作流图组件 */
const WorkflowGraph = memo(() => {
  const workflowState = EditorWorkflow.use();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    flowPosition?: { x: number; y: number };
  } | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { onNodesChange, addNode } = useNodes();
  const { onEdgesChange, onConnect } = useEdges();

  const showMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      if (reactFlowWrapper.current) {
        const flowPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        setMenu({
          x: event.clientX,
          y: event.clientY,
          flowPosition,
        });
      }
    },
    [screenToFlowPosition],
  );

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  const handleNodeSelect = useCallback(
    (type: NodeType) => {
      if (menu?.flowPosition) {
        addNode(type, menu.flowPosition);
      }
    },
    [menu?.flowPosition, addNode],
  );

  const flowConfig = useMemo(
    () => ({
      ...FLOW_CONFIG,
      panOnScroll: true,
      panOnDrag: [1, 2],
      selectionOnDrag: true,
      selectNodesOnDrag: true,
      preventScrolling: true,
      selectionMode: SelectionMode.Partial,
    }),
    [],
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <ReactFlow
        nodes={Object.values(workflowState.data.nodes || {})}
        edges={Object.values(workflowState.data.edges || {})}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPaneContextMenu={showMenu}
        onDoubleClick={showMenu}
        onClick={closeMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="w-full h-full bg-background"
        {...flowConfig}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          onSelect={handleNodeSelect}
        />
      )}
    </div>
  );
});

/* 工作流编辑器 */
export const WorkflowEditor = () => {
  const queryId = useQuery("id");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initWorkflow = async () => {
      try {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (queryId) {
          EditorWorkflow.reset(queryId);
        }
      } catch (error) {
        console.error("初始化工作流失败:", error);
        EditorWorkflow.reset("new");
      } finally {
        setIsLoading(false);
      }
    };

    initWorkflow();
  }, [queryId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">加载中...</div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title={"编辑工作流"} />
      <div className="flex-1 flex flex-col">
        <WorkflowInfo />
        <ReactFlowProvider>
          <WorkflowGraph />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

WorkflowEditor.open = (id: string = "new") => {
  cmd.open("workflow-edit", { id }, { width: 1000, height: 600 });
};
