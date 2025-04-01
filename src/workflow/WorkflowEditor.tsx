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
import { cn } from "@/lib/utils";
import { cmd } from "@/utils/shell";
import { motion } from "framer-motion";
import { memo, Suspense, useCallback, useEffect, useState } from "react";
import {
  TbBook,
  TbLoader2,
  TbMaximize,
  TbMinimize,
  TbPencil,
  TbPlayerPlay,
} from "react-icons/tb";
import ReactFlow, {
  Background,
  ReactFlowProvider,
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { DragToolbar } from "./components/DragToolbar";
import { FlowControls } from "./components/FlowControls";
import { FlowProvider, useFlow } from "./context/FlowContext";
import { ParamHistory } from "./execute/ParamHistory";
import { ContextWorkflow, Workflow } from "./execute/Workflow";
import { SchedulerManager } from "./scheduler/SchedulerManager";
import { edgeTypes, nodeTypes, StartNodeConfig } from "./types/nodes";

/* 工作流表单组件
 *
 */
export const WorkflowInfo = memo(
  ({
    isFullscreen,
    onToggleFullscreen,
  }: {
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
  }) => {
    const meta = ContextWorkflow.use((selector) => selector.meta);
    const { bool } = ContextWorkflow.executor.useIsExecuting();
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const scheduler = SchedulerManager.use((selector) => selector[meta.id]);

    // 处理名称变更
    const handleNameChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        ContextWorkflow.updateMeta({ name: e.target.value });
      },
      [ContextWorkflow],
    );

    // 处理描述变更
    const handleDescriptionChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        ContextWorkflow.updateMeta({ description: e.target.value });
      },
      [ContextWorkflow],
    );

    // 处理定时启用状态变更
    const handleScheduleEnabledChange = useCallback(
      (checked: boolean) => {
        if (checked) {
          // 确保 frequency 已经初始化
          if (!scheduler?.schedules?.[0]) {
            SchedulerManager.schedule(meta.id, "0 0 * * * ?");
          }
          // 使用当前的 frequency 配置更新定时任务
          SchedulerManager.schedule(
            meta.id,
            scheduler?.schedules?.[0] || "0 0 * * * ?",
          );
        } else {
          SchedulerManager.unschedule(meta.id);
        }
      },
      [meta.id, scheduler?.schedules?.[0]],
    );

    // 处理 cron 表达式变更
    const handleCronExpressionChange = useCallback(
      (newExpression: string) => {
        SchedulerManager.schedule(meta.id, newExpression);
      },
      [meta.id],
    );
    // 处理执行测试
    const handleExecuteTest = useCallback(async () => {
      dialog({
        title: "Please enter parameters",
        className: "w-[480px]",
        content: (close) => (
          <ParamInputDialog close={close} workflow={ContextWorkflow} />
        ),
      });
    }, [ContextWorkflow]);

    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold truncate">
            {meta.name || "Unnamed Workflow"}
          </h3>

          <div className="flex items-center gap-2">
            <Button onClick={onToggleFullscreen} variant="ghost">
              {isFullscreen ? (
                <>
                  <TbMinimize className="w-4 h-4" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <TbMaximize className="w-4 h-4" />
                  Fullscreen
                </>
              )}
            </Button>
            <Button onClick={() => setIsEditDrawerOpen(true)} variant="ghost">
              <TbPencil className="w-4 h-4" />
              Edit
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
              Documentation
            </Button>
            <Button
              onClick={handleExecuteTest}
              disabled={bool}
              variant="primary"
            >
              {bool ? (
                <span className="flex items-center gap-2">
                  <TbLoader2 className="w-4 h-4 animate-spin" />
                  Executing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <TbPlayerPlay className="w-4 h-4" />
                  Test
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
          key={meta.id}
          title={
            <Input
              defaultValue={meta.name}
              variant="title"
              className="p-0 m-0 rounded-none "
              onChange={handleNameChange}
              placeholder="Enter workflow name"
            />
          }
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Textarea
                        defaultValue={meta.description}
                        onChange={handleDescriptionChange}
                        placeholder="Enter workflow description"
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                    <div className="space-y-4 pt-4">
                      <h4 className="font-bold">Schedule Settings</h4>
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Cron Expression</label>
                        <Switch
                          checked={scheduler?.enabled}
                          onCheckedChange={handleScheduleEnabledChange}
                        />
                      </div>
                      {scheduler?.enabled && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <CronInput
                              value={scheduler?.schedules?.[0] || ""}
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
  },
);

/* CronInput 组件 */

/* 工作流图组件 */
const WorkflowGraph = memo(() => {
  const viewport = ContextWorkflow.use((selector) => selector.body.viewport);
  const workflowData = ContextWorkflow.use();
  const {
    onDragOver,
    onDrop,
    reactFlowWrapper,
    onMoveEnd,
    onNodesChange,
    nodes,
    onEdgesChange,
    onConnect,
    edges,
  } = useFlow();

  useEffect(() => {
    console.log(workflowData?.meta.id);
  }, [workflowData?.meta.id]);

  if (!workflowData?.meta.id) {
    throw Promise.reject(new Error("工作流 ID 不存在"));
  }

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative rounded-lg border focus-within:border-primary/40 overflow-hidden"
    >
      <ReactFlow
        key={workflowData?.meta.id}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={viewport}
        minZoom={0.1}
        maxZoom={10}
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        onMoveEnd={onMoveEnd}
        className="w-full h-full bg-background"
        elementsSelectable
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Control", "Meta"]}
        panActivationKeyCode="Space"
        elevateNodesOnSelect={true}
        defaultEdgeOptions={{
          type: "default",
          animated: false,
        }}
        autoPanOnConnect={true}
        proOptions={{ hideAttribution: true }}
        nodeOrigin={[0.5, 0.5]}
        fitViewOptions={{ padding: 0.2 }}
        autoPanOnNodeDrag={true}
        selectionOnDrag={true}
        connectOnClick
      >
        <Background gap={25} />
        <FlowControls position="bottom-center" showZoom showFitView showReset />
        <DragToolbar position="left" />
      </ReactFlow>
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
  const history = ParamHistory.use(
    (state) => state[workflowState?.meta.id] || [],
  );

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
    if (workflowState?.meta.id) {
      ParamHistory.addHistory(workflowState.meta.id, paramValues);
    }
    close();
    workflow.execute(paramValues);
  }, [workflow, paramValues, close, workflowState?.meta.id]);

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
                  false,
                ),
              )}
            </div>
          </div>
        );
      }

      if (property.type === "array" && property.items) {
        return null;
      }

      // 获取该字段的历史值
      const fieldHistory = history
        .map((item) => ({
          timestamp: item.timestamp,
          value: currentPath.reduce((obj, key) => obj?.[key], item.values),
        }))
        .filter((item) => item.value !== undefined)
        .slice(0, 3); // 只显示最近3条记录

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
          {fieldHistory.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {fieldHistory.map((item) => (
                <button
                  key={item.timestamp}
                  onClick={() =>
                    handleParamValueChange(currentPath, item.value)
                  }
                  className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                  title={new Date(item.timestamp).toLocaleString()}
                >
                  {String(item.value)}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    },
    [paramValues, handleParamValueChange, history],
  );

  // 渲染所有参数输入
  const renderParamInputs = useCallback(() => {
    const startNode = Object.values(workflowState?.body.nodes || {}).find(
      (node) => node.type === "start",
    );
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
  }, [workflowState?.body.nodes, renderParamInput, workflowState?.meta.id]);

  return (
    <div className="space-y-4">
      {renderParamInputs()}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-destructive"
          onClick={() => {
            if (workflowState?.meta.id) {
              ParamHistory.clearHistory(workflowState.meta.id);
            }
          }}
        >
          Clear History
        </Button>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button onClick={handleParamConfirm}>Confirm</Button>
      </div>
    </div>
  );
};
/* 工作流编辑器内容 */
export const WorkflowEditor = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <Suspense fallback={<LoadingSpin />}>
      <motion.div
        layout
        className={cn("flex flex-col h-full", {
          "fixed inset-0 top-12 z-50 bg-background": isFullscreen,
          "relative w-full": !isFullscreen,
        })}
        initial={false}
        animate={{
          scale: isFullscreen ? 1 : 1,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        <motion.div
          layout
          className={cn("", {
            "px-4 py-2": isFullscreen,
            "p-0": !isFullscreen,
          })}
        >
          <WorkflowInfo
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        </motion.div>
        <motion.div
          layout
          className={cn("flex-1 min-h-0", {
            "p-4 pt-0": isFullscreen,
            "p-0 pt-2": !isFullscreen,
          })}
        >
          <ReactFlowProvider>
            <FlowProvider>
              <WorkflowGraph />
            </FlowProvider>
          </ReactFlowProvider>
        </motion.div>
      </motion.div>
    </Suspense>
  );
};
