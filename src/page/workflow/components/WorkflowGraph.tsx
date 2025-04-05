import { CronInput } from "@/components/custom/CronInput";
import { Drawer } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Scheduler } from "@/workflow/Scheduler";
import { CurrentWorkflow, Workflow, WorkflowsStore } from "@/workflow/Workflow";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, { Background, SelectionMode, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import { useFlow } from "../context/FlowContext";
import { edgeTypes, nodeTypes, StartNodeConfig } from "../types/nodes";
import { DragToolbar } from "./DragToolbar";
import { FlowControls } from "./FlowControls";
import { ToolProperty } from "@/plugin/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const WorkflowGraph = memo(
  ({
    handleToggleFullscreen,
    isFullscreen,
  }: {
    handleToggleFullscreen: () => void;
    isFullscreen: boolean;
  }) => {
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
      viewport,
    } = useFlow();

    const reactFlowInstance = useReactFlow();
    const isInitialMount = useRef(true);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [isExecuteDrawerOpen, setIsExecuteDrawerOpen] = useState(false);
    const workflow = CurrentWorkflow.use();

    useEffect(() => {
      if (isInitialMount.current) {
        // 初始加载时应用动画
        reactFlowInstance.setViewport(
          { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
          { duration: 300 },
        );
        isInitialMount.current = false;
      } else {
        // 后续更新时不使用动画，避免与缩放操作冲突
        reactFlowInstance.setViewport(
          { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
          { duration: 0 },
        );
      }
    }, [viewport, reactFlowInstance]);

    return (
      <div
        ref={reactFlowWrapper}
        className="w-full h-full relative rounded-lg border focus-within:border-primary/40 overflow-hidden"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
          <FlowControls
            position="bottom-center"
            showZoom
            showFitView
            showReset
            isFullscreen={isFullscreen}
            onMaximize={handleToggleFullscreen}
            onEdit={() => setIsEditDrawerOpen(true)}
            onExecute={() => setIsExecuteDrawerOpen(true)}
          />
          <DragToolbar position="left" />
        </ReactFlow>
        <ExecuteDrawer
          isExecuteDrawerOpen={isExecuteDrawerOpen}
          setIsExecuteDrawerOpen={setIsExecuteDrawerOpen}
          workflow={workflow}
        />
        <InfoDrawer
          isEditDrawerOpen={isEditDrawerOpen}
          setIsEditDrawerOpen={setIsEditDrawerOpen}
          workflow={workflow}
        />
      </div>
    );
  },
);

const InfoDrawer = ({
  isEditDrawerOpen,
  setIsEditDrawerOpen,
  workflow,
}: {
  isEditDrawerOpen: boolean;
  setIsEditDrawerOpen: (open: boolean) => void;
  workflow: Workflow;
}) => {
  const meta = WorkflowsStore.use((selector) => selector[workflow.meta.id]);
  const scheduler = Scheduler.use();

  const [cron, setCron] = useState<string>("");
  // 处理描述变更
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      workflow.updateMeta({ description: e.target.value });
    },
    [workflow],
  );

  // 处理定时启用状态变更
  const handleScheduleEnabledChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        // 使用当前的 frequency 配置更新定时任务
        Scheduler.add(meta.id, cron);
      } else {
        Scheduler.cancel(meta.id);
      }
    },
    [meta.id, scheduler],
  );

  // 处理 cron 表达式变更
  const handleCronExpressionChange = useCallback(
    (newExpression: string) => {
      setCron(newExpression);
      Scheduler.update(meta.id, newExpression);
    },
    [meta.id],
  );
  return (
    <Drawer
      direction="right"
      open={isEditDrawerOpen}
      onOpenChange={setIsEditDrawerOpen}
      className="w-[380px]"
      title="Workflow Trigger"
      key={`edit-${meta.id}`}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <div className="space-y-4">
                <Label>Trigger Description</Label>
                <div className="space-y-2">
                  <Textarea
                    defaultValue={meta.description}
                    onChange={handleDescriptionChange}
                    placeholder="Enter workflow description for llm trigger"
                    className="min-h-[100px] resize-none"
                  />
                </div>
                <div className="space-y-4 pt-4">
                  <Label>Schedule</Label>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Cron Expression</label>
                    <Switch
                      checked={meta.id in scheduler}
                      onCheckedChange={handleScheduleEnabledChange}
                    />
                  </div>
                  {meta.id in scheduler && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <CronInput
                          value={cron}
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
  );
};

const ExecuteDrawer = ({
  isExecuteDrawerOpen,
  setIsExecuteDrawerOpen,
  workflow,
}: {
  isExecuteDrawerOpen: boolean;
  setIsExecuteDrawerOpen: (open: boolean) => void;
  workflow: Workflow;
}) => {
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const { nodes } = useFlow();

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
    workflow.execute(paramValues);
  }, [workflow, paramValues]);

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
    const startNode = nodes.find((node) => node.type === "start");
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
  }, [nodes, renderParamInput]);

  return (
    <Drawer
      direction="right"
      open={isExecuteDrawerOpen}
      onOpenChange={setIsExecuteDrawerOpen}
      className="w-[380px]"
      key={`execute-${workflow.meta.id}`}
      title="Execute Workflow"
    >
      <div className="space-y-4">
        {renderParamInputs()}
        <div className="flex justify-end gap-2">
          <Button
            className="w-full h-10"
            variant="primary"
            onClick={handleParamConfirm}
          >
            Confirm
          </Button>
        </div>
      </div>{" "}
    </Drawer>
  );
};
