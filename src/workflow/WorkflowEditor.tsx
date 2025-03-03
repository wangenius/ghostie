import { CronInput } from "@/components/custom/CronInput";
import { LoadingSpin } from "@/components/custom/LoadingSpin";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cmd } from "@/utils/shell";
import { debounce } from "lodash";
import { memo, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { TbBook, TbLoader2, TbPencil, TbPlayerPlay } from "react-icons/tb";
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
import { useEditorWorkflow } from "./context/EditorContext";
import { useEdges } from "./hooks/useEdges";
import { BotNode } from "./nodes/BotNode";
import { BranchNode } from "./nodes/BranchNode";
import { ChatNode } from "./nodes/ChatNode";
import { EndNode } from "./nodes/EndNode";
import { FilterNode } from "./nodes/FilterNode";
import { PanelNode } from "./nodes/PanelNode";
import { PluginNode } from "./nodes/PluginNode";
import { StartNode } from "./nodes/StartNode";
import { SchedulerManager } from "./scheduler/SchedulerManager";
import { NodeType } from "./types/nodes";
import { Workflow } from "./Workflow";

type FrequencyType = "cron";

interface FrequencyConfig {
  type: FrequencyType;
  cronExpression?: string;
}

/* 节点类型 */
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  chat: ChatNode,
  bot: BotNode,
  plugin: PluginNode,
  branch: BranchNode,
  filter: FilterNode,
  panel: PanelNode,
} as const;

/* 边类型 */
const edgeTypes = {
  default: CustomEdge,
};

/* 工作流表单组件 */
export const WorkflowInfo = memo(() => {
  const workflow = useEditorWorkflow();
  const workflowState = workflow.use();
  const scheduler = SchedulerManager.use();
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [frequency, setFrequency] = useState<FrequencyConfig>({
    type: "cron",
  });

  // 打开编辑抽屉时初始化数据
  const handleOpenEdit = useCallback(() => {
    setEditName(workflowState?.data.name || "");
    setEditDescription(workflowState?.data.description || "");

    // 获取当前定时任务状态
    const currentSchedule = scheduler[workflowState?.data.id];
    setScheduleEnabled(currentSchedule?.enabled || false);

    // 解析现有的 cron 表达式
    if (currentSchedule?.schedules?.[0]) {
      setFrequency({
        type: "cron",
        cronExpression: currentSchedule.schedules[0],
      });
    } else {
      // 如果没有现有的定时任务，设置默认值
      setFrequency({
        type: "cron",
        cronExpression: "0 0 * * * ?",
      });
    }

    setIsEditDrawerOpen(true);
  }, [
    workflowState?.data.name,
    workflowState?.data.description,
    scheduler,
    workflowState?.data.id,
  ]);

  // 处理名称变更
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setEditName(newName);
      workflow.set((state) => ({
        ...state,
        data: {
          ...state.data,
          name: newName,
        },
      }));
    },
    [workflow],
  );

  // 处理描述变更
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newDescription = e.target.value;
      setEditDescription(newDescription);
      workflow.set((state) => ({
        ...state,
        data: {
          ...state.data,
          description: newDescription,
        },
      }));
    },
    [workflow],
  );

  // 处理定时启用状态变更
  const handleScheduleEnabledChange = useCallback(
    (checked: boolean) => {
      setScheduleEnabled(checked);
      if (checked) {
        // 确保 frequency 已经初始化
        if (!frequency.cronExpression) {
          setFrequency({
            type: "cron",
            cronExpression: "0 0 * * * ?",
          });
        }
        // 使用当前的 frequency 配置更新定时任务
        SchedulerManager.schedule(
          workflowState?.data.id,
          frequency.cronExpression || "0 0 * * * ?",
        );
      } else {
        SchedulerManager.unschedule(workflowState?.data.id);
      }
    },
    [workflowState?.data.id, frequency.cronExpression],
  );

  // 处理 cron 表达式变更
  const handleCronExpressionChange = useCallback(
    (newExpression: string) => {
      setFrequency((prev) => ({
        ...prev,
        cronExpression: newExpression,
      }));
      if (scheduleEnabled) {
        SchedulerManager.schedule(workflowState?.data.id, newExpression);
      }
    },
    [scheduleEnabled, workflowState?.data.id],
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold truncate">
          {workflowState?.data.name || "未命名工作流"}
        </h3>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenEdit} variant="ghost">
            <TbPencil className="w-4 h-4" />
            编辑
          </Button>
          <Button
            onClick={() => {
              window.open(
                "https://ccn0kkxjz1z2.feishu.cn/wiki/MxzywoXxaiyF08kRREkcEl1Vnfh",
              );
            }}
            variant="ghost"
          >
            <TbBook className="w-4 h-4" />
            开发文档
          </Button>
          <Button
            onClick={() => workflow.execute()}
            disabled={workflowState?.isExecuting}
            variant="primary"
          >
            {workflowState?.isExecuting ? (
              <span className="flex items-center gap-2">
                <TbLoader2 className="w-4 h-4 animate-spin" />
                执行中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <TbPlayerPlay className="w-4 h-4" />
                执行
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 编辑抽屉 */}
      <Drawer
        direction="right"
        open={isEditDrawerOpen}
        onOpenChange={setIsEditDrawerOpen}
        className="w-[380px]"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">编辑工作流</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  修改工作流的基本信息
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">名称</label>
                    <Input
                      value={editName}
                      onChange={handleNameChange}
                      placeholder="输入工作流名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">描述</label>
                    <Textarea
                      value={editDescription}
                      onChange={handleDescriptionChange}
                      placeholder="输入工作流描述"
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-medium">定时设置</h4>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">启用定时执行</label>
                      <Switch
                        checked={scheduleEnabled}
                        onCheckedChange={handleScheduleEnabledChange}
                      />
                    </div>
                    {scheduleEnabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Cron 表达式
                          </label>
                          <CronInput
                            value={frequency.cronExpression || ""}
                            onChange={handleCronExpressionChange}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
});

/* CronInput 组件 */

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
    throw Promise.reject(new Error("工作流 ID 不存在"));
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
      className="w-full h-full relative rounded-lg border focus-within:border-primary/40 overflow-hidden"
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
export const WorkflowEditor = () => {
  /** 编辑器的工作流实例 */
  const workflow = useEditorWorkflow();

  return (
    <Suspense fallback={<LoadingSpin />}>
      <WorkflowInfo />
      <ReactFlowProvider>
        <WorkflowGraph workflow={workflow} />
      </ReactFlowProvider>
    </Suspense>
  );
};

WorkflowEditor.open = async (id: string = "new") => {
  try {
    cmd.open("workflow-edit", { id }, { width: 1000, height: 600 });
  } catch (error) {
    console.error("打开工作流失败:", error);
  }
};
