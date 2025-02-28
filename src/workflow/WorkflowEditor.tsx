import { DelayedSuspense } from "@/components/custom/DelayedSuspense";
import { Header } from "@/components/custom/Header";
import { LoadingSpin } from "@/components/custom/LoadingSpin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@/hook/useQuery";
import { cmd } from "@/utils/shell";
import { Play } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  NodeChange,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  Viewport,
} from "reactflow";
import "reactflow/dist/style.css";
import { ContextMenu } from "./components/ContextMenu";
import { CustomEdge } from "./components/CustomEdge";
import { useEdges } from "./hooks/useEdges";
import { BotNode } from "./nodes/BotNode";
import { BranchNode } from "./nodes/BranchNode";
import { ChatNode } from "./nodes/ChatNode";
import { EndNode } from "./nodes/EndNode";
import { FilterNode } from "./nodes/FilterNode";
import { PluginNode } from "./nodes/PluginNode";
import { StartNode } from "./nodes/StartNode";
import { NodeType } from "./types/nodes";
import {
  EditorContextProvider,
  useEditorWorkflow,
} from "./context/EditorContext";
import { Workflow } from "./Workflow";

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

/* 工作流表单组件 */
const WorkflowInfo = memo(() => {
  const workflow = useEditorWorkflow();
  const workflowState = workflow.use();

  return (
    <div className="flex items-center gap-4 px-3 bg-card">
      <div className="flex-1 grid grid-cols-[1fr,1.5fr] gap-3">
        <Input
          value={workflowState?.data.name}
          onChange={(e) => {
            workflow.set((state) => ({
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
          value={workflowState?.data.description}
          onChange={(e) => {
            workflow.set((state) => ({
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
          onClick={() => workflow.execute()}
          disabled={workflowState?.isExecuting}
          size="sm"
          className="h-8"
        >
          <Play className="w-4 h-4" />
          {workflowState?.isExecuting ? "执行中..." : "执行"}
        </Button>
      </div>
    </div>
  );
});

/* 工作流图组件 */
const WorkflowGraph = memo(({ workflow }: { workflow: Workflow }) => {
  const workflowState = workflow.use();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    flowPosition?: { x: number; y: number };
  } | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
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
        workflow.addNode(type, menu.flowPosition);
      }
    },
    [menu?.flowPosition, workflow],
  );

  const onNodesChange = (changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === "position" && change.position) {
        workflow.updateNodePosition(change.id, change.position);
      } else if (change.type === "remove") {
        workflow.removeNode(change.id);
      } else if (change.type === "select") {
        workflow.set((state) => ({
          ...state,
          data: {
            ...state.data,
            nodes: {
              ...state.data.nodes,
              [change.id]: {
                ...state.data.nodes[change.id],
                selected: change.selected,
              },
            },
          },
        }));
      } else if (change.type === "dimensions") {
        const dimensions = (change as any).dimensions;
        if (dimensions) {
          workflow.set((state) => ({
            ...state,
            data: {
              ...state.data,
              nodes: {
                ...state.data.nodes,
                [change.id]: {
                  ...state.data.nodes[change.id],
                },
              },
            },
          }));
        }
      }
    });
  };

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <ReactFlow
        key={workflowState.data.id}
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
        defaultViewport={workflowState.data?.viewport}
        minZoom={0.1}
        maxZoom={10}
        panOnDrag={[0, 1, 2]}
        selectionMode={SelectionMode.Partial}
        onMoveEnd={(_, viewport: Viewport) => {
          workflow.set((state) => ({
            ...state,
            data: {
              ...state.data,
              viewport: {
                x: viewport.x,
                y: viewport.y,
                zoom: viewport.zoom,
              },
            },
          }));
        }}
        className="w-full h-full bg-background"
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

/* 工作流编辑器内容 */
const WorkflowEditorContent = () => {
  /** 编辑器的工作流实例 */
  const workflow = useEditorWorkflow();
  /** 查询参数 */
  const { value, setValue } = useQuery("id");

  useEffect(() => {
    if (value) {
      workflow.reset(value);
    }
  }, [value, workflow]);

  if (!value) return null;

  return (
    <div className="flex flex-col h-screen">
      <Header
        title={"编辑工作流"}
        close={() => {
          setValue("");
          workflow.reset();
          cmd.close();
        }}
      />
      <DelayedSuspense
        fallback={<LoadingSpin />}
        minDelay={300}
        className="flex-col"
      >
        <ReactFlowProvider>
          <WorkflowInfo />
          <WorkflowGraph workflow={workflow} />
        </ReactFlowProvider>
      </DelayedSuspense>
    </div>
  );
};

/** 工作流编辑器 */
export const WorkflowEditor = () => {
  return (
    <EditorContextProvider>
      <WorkflowEditorContent />
    </EditorContextProvider>
  );
};

WorkflowEditor.open = async (id: string = "new") => {
  try {
    cmd.open("workflow-edit", { id }, { width: 1000, height: 600 });
  } catch (error) {
    console.error("打开工作流失败:", error);
  }
};
