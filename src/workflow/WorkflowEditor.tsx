import { ToolProperty } from "@/common/types/plugin";
import { CronInput } from "@/components/custom/CronInput";
import { dialog } from "@/components/custom/DialogModal";
import { LoadingSpin } from "@/components/custom/LoadingSpin";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { debounce } from "lodash";
import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TbBook, TbLoader2, TbPencil, TbPlayerPlay } from "react-icons/tb";
import ReactFlow, {
  Background,
  NodeChange,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  Viewport,
} from "reactflow";
import "reactflow/dist/style.css";
import { ContextMenu } from "./components/ContextMenu";
import { CustomControls } from "./components/CustomControls";
import { edgeTypes, nodeTypes } from "./constants";
import { useEdges } from "./hooks/useEdges";
import { SchedulerManager } from "./scheduler/SchedulerManager";
import { NodeType, StartNodeConfig } from "./types/nodes";
import { Workflow } from "./Workflow";
import { cmd } from "@/utils/shell";
type FrequencyType = "cron";

interface FrequencyConfig {
  type: FrequencyType;
  cronExpression?: string;
}

/* 工作流表单组件 */
export const WorkflowInfo = memo(() => {
  const workflow = Workflow.instance;
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
  // 处理执行测试
  const handleExecuteTest = useCallback(async () => {
    dialog({
      title: "请输入参数",
      className: "w-[480px]",
      content: (close) => (
        <ParamInputDialog close={close} workflow={workflow} />
      ),
    });
  }, [workflow]);

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
              cmd.invoke("open_url", {
                url: "https://ghostie.wangenius.com/tutorials/workflow",
              });
            }}
            variant="ghost"
          >
            <TbBook className="w-4 h-4" />
            开发文档
          </Button>
          <Button
            onClick={handleExecuteTest}
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
                执行测试
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
                <div className="space-y-4">
                  <div>
                    <Input
                      value={editName}
                      variant="title"
                      className="p-0 m-0 rounded-none "
                      onChange={handleNameChange}
                      placeholder="输入工作流名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      value={editDescription}
                      onChange={handleDescriptionChange}
                      placeholder="输入工作流描述"
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-bold">定时设置</h4>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Cron表达式</label>
                      <Switch
                        checked={scheduleEnabled}
                        onCheckedChange={handleScheduleEnabledChange}
                      />
                    </div>
                    {scheduleEnabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
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
const WorkflowGraph = memo(() => {
  const workflow = Workflow.instance;
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

  useEffect(() => {
    console.log(workflowState.data.nodes);
  }, [workflowState.data.nodes]);

  // 使用 useMemo 缓存节点和边的数据
  const nodes = Object.values(workflowState.data.nodes);

  const edges = Object.values(workflowState.data.edges);

  // 使用 useCallback 和 debounce 优化节点位置更新
  const updateNodePosition = useCallback(
    debounce((id: string, position: { x: number; y: number }) => {
      requestAnimationFrame(() => {
        workflow.updateNodePosition(id, position);
      });
    }, 8),
    [workflow],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const positionChanges: {
        id: string;
        position: { x: number; y: number };
      }[] = [];

      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          positionChanges.push({ id: change.id, position: change.position });
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

      // 批量更新位置
      if (positionChanges.length > 0) {
        updateNodePosition(
          positionChanges[positionChanges.length - 1].id,
          positionChanges[positionChanges.length - 1].position,
        );
      }
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
        snapToGrid={true}
        snapGrid={[25, 25]}
        elevateNodesOnSelect={true}
        defaultEdgeOptions={{
          type: "default",
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        nodeOrigin={[0.5, 0.5]}
        fitViewOptions={{ padding: 0.2 }}
        autoPanOnNodeDrag={true}
      >
        <Background gap={25} />
        <CustomControls
          position="bottom-center"
          showZoom
          showFitView
          showReset
        />
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

const ParamInputDialog = ({
  close,
  workflow,
}: {
  close: () => void;
  workflow: Workflow;
}) => {
  const workflowState = workflow.use();
  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  // 处理参数值变更
  const handleParamValueChange = useCallback((path: string[], value: any) => {
    setParamValues((prev) => {
      const newValues = { ...prev };
      let current = newValues;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newValues;
    });
  }, []);

  // 处理参数确认
  const handleParamConfirm = useCallback(() => {
    workflow.updateNode("start", {
      inputs: paramValues,
    });
    close();
    workflow.execute();
  }, [workflow, paramValues, close]);

  // 渲染单个参数输入项
  const renderParamInput = useCallback(
    (
      name: string,
      property: ToolProperty,
      path: string[] = [],
      required: boolean = false,
    ) => {
      const currentPath = [...path, name];
      const currentValue = currentPath.reduce(
        (obj, key) => obj?.[key],
        paramValues,
      );

      if (property.type === "object" && property.properties) {
        return (
          <div key={name} className="space-y-2 border rounded-lg p-4">
            <Label className="font-bold">
              {name}
              {required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-4 pl-4">
              {Object.entries(property.properties).map(([subName, subProp]) =>
                renderParamInput(
                  subName,
                  subProp as ToolProperty,
                  currentPath,
                  false, // 对象内部的必填项在 ToolParameters 中定义
                ),
              )}
            </div>
          </div>
        );
      }

      if (property.type === "array" && property.items) {
        // TODO: 数组类型的处理可以在这里添加
        return null;
      }

      return (
        <div key={name} className="space-y-2">
          <Label>
            {name}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            type={property.type === "number" ? "number" : "text"}
            placeholder={property.description}
            value={currentValue?.toString() || ""}
            onChange={(e) =>
              handleParamValueChange(
                currentPath,
                property.type === "number"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        </div>
      );
    },
    [paramValues, handleParamValueChange],
  );

  // 渲染所有参数输入
  const renderParamInputs = useCallback(() => {
    const startNode = workflowState?.data.nodes["start"];
    if (!startNode) return null;

    const parameters = (startNode.data as StartNodeConfig).parameters;
    if (!parameters?.properties) return null;

    return (
      <div className="space-y-4">
        {Object.entries(parameters.properties).map(([name, prop]) => {
          return renderParamInput(
            name,
            prop as ToolProperty,
            [],
            parameters.required?.includes(name) || false,
          );
        })}
      </div>
    );
  }, [workflowState?.data.nodes, renderParamInput]);

  return (
    <div className="space-y-4">
      {renderParamInputs()}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={close}>
          取消
        </Button>
        <Button onClick={handleParamConfirm}>确认</Button>
      </div>
    </div>
  );
};
/* 工作流编辑器内容 */
export const WorkflowEditor = () => {
  return (
    <Suspense fallback={<LoadingSpin />}>
      <WorkflowInfo />
      <ReactFlowProvider>
        <WorkflowGraph />
      </ReactFlowProvider>
    </Suspense>
  );
};
