import { CronInput } from "@/components/custom/CronInput";
import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { memo, useCallback, useEffect, useState } from "react";
import {
  TbDots,
  TbFileText,
  TbMaximize,
  TbMinimize,
  TbPencil,
  TbPlayerPlay,
  TbUpload,
} from "react-icons/tb";
import "reactflow/dist/style.css";
import { Scheduler } from "../../workflow/Scheduler";
import {
  CurrentWorkflow,
  Workflow,
  WorkflowStore,
} from "../../workflow/Workflow";

import { Label } from "@/components/ui/label";
import { ToolProperty } from "@/plugin/types";
import { useFlow } from "./context/FlowContext";
import { StartNodeConfig } from "./types/nodes";
export const WorkflowInfo = memo(
  ({
    isFullscreen,
    onToggleFullscreen,
  }: {
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
  }) => {
    const workflow = CurrentWorkflow.use();
    const meta = WorkflowStore.use((selector) => selector[workflow.meta.id]);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [isExecutingDrawerOpen, setIsExecutingDrawerOpen] = useState(false);
    const scheduler = Scheduler.use();

    const [cron, setCron] = useState<string>("");

    useEffect(() => {
      if (meta.id in scheduler) {
        setCron(scheduler[meta.id]);
      }
    }, [scheduler, meta?.id]);

    // 处理名称变更
    const handleNameChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        workflow.updateMeta({ name: e.target.value });
      },
      [workflow],
    );

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

    const handleUpload = async () => {
      dialog.confirm({
        title: "Upload Workflow",
        content: "Are you sure to upload this workflow?",
        onOk: async () => {
          try {
            // 获取完整的工作流数据
            const workflowData = workflow;

            // 上传到 Supabase
            const { error } = await supabase.from("workflows").insert({
              name: workflowData.meta.name,
              description: workflowData.meta.description,
              data: workflowData,
            });

            if (error) throw error;

            cmd.message("Successfully uploaded workflow to market", "success");
            close();
          } catch (error) {
            console.error("Upload workflow failed:", error);
            cmd.message(
              `Upload workflow failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
              "error",
            );
          }
        },
      });
    };

    return (
      <div key={meta.id} className="flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold truncate">
            {meta.name || "Unnamed Workflow"}
          </h3>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                cmd.invoke("open_url", {
                  url: "https://ghostie.wangenius.com/tutorials/workflow",
                });
              }}
              variant="ghost"
            >
              <TbFileText className="w-4 h-4" />
              Documentation
            </Button>
            <Button
              onClick={onToggleFullscreen}
              variant="ghost"
              size="icon"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <TbMinimize className="w-4 h-4" />
              ) : (
                <TbMaximize className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={() => setIsEditDrawerOpen(true)}
              variant="ghost"
              size="icon"
              title="Edit"
            >
              <TbPencil className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setIsExecutingDrawerOpen(true)}
              size="icon"
              title="Execute"
            >
              <TbPlayerPlay className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <TbDots className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleUpload}>
                  <TbUpload className="w-4 h-4" />
                  Upload to Market
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Drawer
          direction="right"
          open={isExecutingDrawerOpen}
          onOpenChange={setIsExecutingDrawerOpen}
          className="w-[380px]"
          key={`execute-${meta.id}`}
          title="Execute Workflow"
        >
          <ParamInputDialog workflow={workflow} />
        </Drawer>

        {/* 编辑抽屉 */}
        <Drawer
          direction="right"
          open={isEditDrawerOpen}
          onOpenChange={setIsEditDrawerOpen}
          className="w-[380px]"
          key={`edit-${meta.id}`}
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
      </div>
    );
  },
);
const ParamInputDialog = ({ workflow }: { workflow: Workflow }) => {
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
    </div>
  );
};
