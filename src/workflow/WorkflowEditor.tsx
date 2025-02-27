import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@/hook/useQuery";
import { cmd } from "@/utils/shell";
import { Play } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  TbArrowsSplit,
  TbCheck,
  TbFilter,
  TbFlag,
  TbMessage,
  TbPlug,
  TbRobot,
} from "react-icons/tb";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  EdgeChange,
  MarkerType,
  NodeChange,
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
import {
  FilterNodeConfig,
  NodeConfig,
  NodeType,
  WorkflowNode,
} from "./types/nodes";
import { Workflow } from "./Workflow";
import { gen } from "@/utils/generator";
import { Menu } from "@/components/ui/menu";
import { AnimatePresence, motion } from "framer-motion";
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
/* 节点类型 */
const NODE_TYPES = {
  start: { label: "开始", icon: TbFlag },
  end: { label: "结束", icon: TbFlag },
  chat: { label: "对话", icon: TbMessage },
  bot: { label: "机器人", icon: TbRobot },
  plugin: { label: "插件", icon: TbPlug },
  branch: { label: "分支", icon: TbArrowsSplit },
  filter: { label: "过滤", icon: TbFilter },
};

export const EditorWorkflow = new Workflow();

/* 工作流表单组件 */
const WorkflowInfo = memo(() => {
  const workflow = EditorWorkflow.use();
  const handleSave = () => {
    const newErrors: { name?: string; description?: string } = {};
    if (!workflow?.data.name.trim()) {
      newErrors.name = "工作流名称不能为空";
    }
    if (!workflow?.data.description.trim()) {
      newErrors.description = "工作流描述不能为空";
    }

    if (Object.keys(newErrors).length === 0) {
      EditorWorkflow.save();
    }
  };

  const handleExecute = async () => {
    if (!workflow) return;
    try {
      EditorWorkflow.set((state) => ({
        ...state,
        isExecuting: true,
      }));
      const result = await EditorWorkflow.execute();
      if (!result.success) {
        console.error("工作流执行失败:", result.error);
      }
    } finally {
      EditorWorkflow.set((state) => ({
        ...state,
        isExecuting: false,
      }));
    }
  };

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleSave]);

  return (
    <div className="flex items-center gap-4 px-3 bg-card">
      {/* 工作流信息 */}
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
          onClick={handleExecute}
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

  /* 节点变化 */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!EditorWorkflow) return;

      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          EditorWorkflow.updateNodePosition(change.id, change.position);
        } else if (change.type === "remove") {
          EditorWorkflow.removeNode(change.id);
        } else if (change.type === "select") {
          EditorWorkflow.set((state) => ({
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
            EditorWorkflow.set((state) => ({
              ...state,
              data: {
                ...state.data,
                nodes: {
                  ...state.data.nodes,
                  [change.id]: {
                    ...state.data.nodes[change.id],
                    width: dimensions.width,
                    height: dimensions.height,
                  },
                },
              },
            }));
          }
        }
      });
    },
    [EditorWorkflow],
  );

  /* 边变化 */
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!EditorWorkflow) return;

      changes.forEach((change) => {
        if (change.type === "remove") {
          EditorWorkflow.removeEdge(change.id);
        }
      });
    },
    [EditorWorkflow],
  );

  /* 连接 */
  const onConnect = useCallback(
    (params: Connection) => {
      if (!EditorWorkflow) return;

      const sourceId = params.sourceHandle || "";
      const targetId = params.targetHandle || "";

      if (!sourceId || !targetId) {
        console.warn("无法创建连接：缺少源或目标连接点ID");
        return;
      }

      const edge = {
        ...params,
        id: gen.id(),
        type: "default",
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          type: "default",
          sourceHandle: sourceId,
          targetHandle: targetId,
        },
      };

      EditorWorkflow.addEdge(edge);
    },
    [EditorWorkflow],
  );

  /* 添加节点 */
  const addNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      if (!EditorWorkflow) return;

      // 根据节点类型初始化数据
      const baseData = {
        type,
        name: type,
        inputs: {},
        outputs: {},
      };

      let nodeData;
      switch (type) {
        case "start":
          nodeData = {
            ...baseData,
          };
          break;
        case "end":
          nodeData = {
            ...baseData,
          };
          break;
        case "chat":
          nodeData = {
            ...baseData,
            model: "",
            system: "",
          };
          break;
        case "bot":
          nodeData = {
            ...baseData,
            bot: "",
          };
          break;
        case "plugin":
          nodeData = {
            ...baseData,
            plugin: "",
            tool: "",
            args: {},
          };
          break;
        case "branch":
          nodeData = {
            ...baseData,
            conditions: [],
          };
          break;
        case "filter":
          nodeData = {
            ...baseData,
            filter: {
              fields: [],
              conditions: [],
            },
          } as FilterNodeConfig;
          break;
        default:
          nodeData = baseData;
      }

      const newNode: WorkflowNode = {
        id: gen.id(),
        type,
        name: type,
        position,
        data: nodeData as NodeConfig,
      };

      EditorWorkflow.addNode(newNode);
    },
    [EditorWorkflow],
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
        onPaneContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          showMenu(e);
        }}
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
        <AnimatePresence mode="wait">
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
            className="fixed z-50 min-w-[160px] flex flex-col gap-1"
            style={{
              top: menu.y,
              left: menu.x,
              transformOrigin: "top left",
            }}
          >
            <Menu
              items={Object.entries(NODE_TYPES)
                .filter(([type]) => type !== "start" && type !== "end")
                .map(([type, content]) => ({
                  label: content.label,
                  icon: content.icon,
                  onClick: () => {
                    if (menu.flowPosition) {
                      addNode(type as NodeType, menu.flowPosition);
                    }
                    closeMenu();
                  },
                }))}
            />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
});

/* 工作流编辑器 */
export const WorkflowEditor = () => {
  /* 查询参数 */
  const queryId = useQuery("id");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initWorkflow = async () => {
      try {
        setIsLoading(true);
        // 等待一个短暂的时间，确保 WorkflowManager 已经初始化
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (queryId) {
          EditorWorkflow.reset(queryId);
        }
      } catch (error) {
        console.error("初始化工作流失败:", error);
        // 如果加载失败，创建一个新的工作流
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
