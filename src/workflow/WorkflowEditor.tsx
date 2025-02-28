import { DelayedSuspense } from "@/components/custom/DelayedSuspense";
import { Header } from "@/components/custom/Header";
import { LoadingSpin } from "@/components/custom/LoadingSpin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@/hook/useQuery";
import { cmd } from "@/utils/shell";
import { Play } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState, useMemo } from "react";
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
import { debounce } from "lodash";

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

  if (!workflowState.data.id) {
    throw Promise.resolve();
  }

  // 使用 useMemo 缓存节点和边的数据
  const nodes = useMemo(
    () => Object.values(workflowState.data.nodes || {}),
    [workflowState.data.nodes],
  );

  const edges = useMemo(
    () => Object.values(workflowState.data.edges || {}),
    [workflowState.data.edges],
  );

  // 使用 useCallback 和 debounce 优化节点位置更新
  const updateNodePosition = useCallback(
    debounce((id: string, position: { x: number; y: number }) => {
      workflow.updateNodePosition(id, position);
    }, 2),
    [workflow],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          updateNodePosition(change.id, change.position);
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
        }
      });
    },
    [workflow, updateNodePosition],
  );

  // 使用 debounce 优化视口更新
  const onMoveEnd = useMemo(
    () =>
      debounce((_: any, viewport: Viewport) => {
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
      }, 100),
    [workflow],
  );

  const preventContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

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

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative"
      onContextMenu={preventContextMenu}
    >
      <ReactFlow
        key={workflowState.data.id}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeContextMenu={preventContextMenu}
        onPaneContextMenu={showMenu}
        onDoubleClick={showMenu}
        onClick={closeMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={workflowState.data?.viewport}
        minZoom={0.1}
        maxZoom={10}
        panOnDrag={[0, 1]}
        selectionMode={SelectionMode.Partial}
        onMoveEnd={onMoveEnd}
        className="w-full h-full bg-background"
        fitView
        elementsSelectable
        nodesDraggable
        nodesConnectable
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Control", "Meta"]}
        panActivationKeyCode="Space"
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
