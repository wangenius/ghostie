import { CronInput } from "@/components/custom/CronInput";
import { dialog } from "@/components/custom/DialogModal";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Drawer } from "@/components/ui/drawer";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ParamInput } from "@/page/plugins/components/ParamInput";
import {
  ExecutionHistory,
  Schedule,
  SCHEDULE_HISTORY_DATABASE,
  Scheduler,
} from "@/page/schedule/Scheduler";
import { StartNodeConfig } from "@/page/workflow/types/nodes";
import { PluginStore } from "@/plugin/ToolPlugin";
import { ToolProperty } from "@/plugin/types";
import { AgentManager } from "@/store/AgentManager";
import { gen } from "@/utils/generator";
import { Workflow, WorkflowsStore } from "@/workflow/Workflow";
import { format } from "date-fns";
import { Echo } from "echo-state";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
  TbChevronDown,
  TbChevronRight,
  TbHistory,
  TbPlug,
  TbPlus,
  TbScriptPlus,
  TbTrash,
} from "react-icons/tb";

export const HistoryStore = new Echo<Record<string, ExecutionHistory>>({});

export const SchedulesTab = () => {
  // 全局状态
  const schedulesData = Scheduler.use();
  const workflows = WorkflowsStore.use();
  const plugins = PluginStore.use();
  const agents = AgentManager.list.use();
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const currentSchedule = schedulesData[selectedSchedule];
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const history = HistoryStore.use();

  // 展开的历史记录项
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {},
  );

  // 插件参数配置对话框
  const [pluginParams, setPluginParams] = useState<Record<string, unknown>>({});

  // 工作流输入参数配置对话框
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, unknown>>(
    {},
  );

  // 获取当前选择工作流的开始节点参数定义
  const [workflowParams, setWorkflowParams] = useState<any>(null);
  const [isLoadingParams, setIsLoadingParams] = useState(false);

  // 当选择的插件变化时，初始化插件参数
  useEffect(() => {
    if (currentSchedule?.pluginId && currentSchedule.type === "plugin") {
      // 使用已保存的参数或初始化为空对象
      setPluginParams(currentSchedule.pluginParams || {});
    } else {
      setPluginParams({});
    }
  }, [currentSchedule?.pluginId, currentSchedule?.type]);

  // 当选择的工作流变化时，初始化工作流输入参数
  useEffect(() => {
    if (currentSchedule?.workflowId && currentSchedule.type === "workflow") {
      // 使用已保存的参数或初始化为空对象
      setWorkflowInputs(currentSchedule.workflowInputs || {});
    } else {
      setWorkflowInputs({});
    }
  }, [currentSchedule?.workflowId, currentSchedule?.type]);

  // 获取当前选择工作流的开始节点参数定义
  const getSelectedWorkflowParams = useCallback(async () => {
    if (!currentSchedule?.workflowId) return null;

    const workflow = workflows[currentSchedule.workflowId];
    if (!workflow) return null;

    try {
      const workflowInstance = await Workflow.get(workflow.id);
      const workflowBody = await workflowInstance.getBody();

      // 查找开始节点
      const startNode = Object.values(workflowBody.nodes).find(
        (node: any) => node.type === "start",
      );

      if (startNode && startNode.data) {
        return (startNode.data as StartNodeConfig).parameters;
      }
      return null;
    } catch (error) {
      console.error("获取工作流参数失败:", error);
      return null;
    }
  }, [currentSchedule?.workflowId, workflows]);

  // 当选择的工作流变化时，获取对应的参数定义
  useEffect(() => {
    if (currentSchedule?.workflowId && currentSchedule.type === "workflow") {
      setIsLoadingParams(true);
      getSelectedWorkflowParams()
        .then((params) => {
          setWorkflowParams(params);
          setIsLoadingParams(false);
        })
        .catch((err) => {
          console.error("加载参数定义失败:", err);
          setIsLoadingParams(false);
        });
    } else {
      setWorkflowParams(null);
    }
  }, [
    currentSchedule?.workflowId,
    currentSchedule?.type,
    getSelectedWorkflowParams,
  ]);

  // 切换历史记录项的展开状态
  const toggleExpandItem = (index: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // 创建新计划
  const handleCreate = async () => {
    // 生成唯一ID
    const id = gen.id();

    // 创建新计划对象
    const newSchedule: Schedule = {
      id,
      name: "新计划",
      type: "workflow",
      cron: "0 0 * * *",
      workflowId: "",
      enabled: false,
    };

    // 保存到存储中
    Scheduler.set((prev) => ({
      ...prev,
      [id]: newSchedule,
    }));
  };

  // 处理计划启用状态变更
  const handleScheduleEnabledChange = (checked: boolean) => {
    if (!currentSchedule?.id) return;

    if (checked) {
      // 根据类型检查是否选择了对应的执行对象
      let canEnable = false;
      let errorMessage = "";

      switch (currentSchedule.type) {
        case "workflow":
          canEnable = !!currentSchedule.workflowId;
          errorMessage = "请先选择要执行的工作流";
          break;
        case "plugin":
          canEnable = !!currentSchedule.pluginId;
          errorMessage = "请先选择要执行的插件";
          break;
        case "agent":
          canEnable = !!currentSchedule.agentId;
          errorMessage = "请先选择要执行的代理";
          break;
      }

      if (!canEnable) {
        dialog.confirm({
          title: "错误",
          content: errorMessage,
          okText: "确定",
          cancelText: "取消",
        });
        return;
      }
    } else {
      // 停止定时任务
      Scheduler.cancel(currentSchedule.id);
    }
    // 启动定时任务
    Scheduler.update(currentSchedule.id, {
      enabled: checked,
    });
  };

  // 处理Cron表达式变更
  const handleCronExpressionChange = useCallback(
    (newExpression: string) => {
      // 如果计划已启用，则更新定时任务
      if (currentSchedule?.id && currentSchedule.enabled) {
        Scheduler.update(currentSchedule.id, {
          cron: newExpression,
        });
      }
    },
    [currentSchedule],
  );

  // 处理计划名称变更
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentSchedule?.id) return;

    const newName = e.target.value;

    // 更新存储中的计划名称
    Scheduler.update(currentSchedule.id, {
      name: newName,
    });
  };

  // 处理代理输入内容变更
  const handleAgentInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (!currentSchedule?.id) return;

    const newInput = e.target.value;

    // 更新存储中的代理输入内容
    Scheduler.update(currentSchedule.id, {
      agentInput: newInput,
    });
  };

  // 处理插件参数变更
  const handlePluginParamChange = (key: string, value: unknown) => {
    const updatedParams = {
      ...pluginParams,
      [key]: value,
    };
    setPluginParams(updatedParams);

    // 直接更新存储中的插件参数
    if (currentSchedule?.id) {
      Scheduler.update(currentSchedule.id, {
        pluginParams: updatedParams,
      });
    }
  };

  // 处理参数值变更（与ExecuteDrawer.tsx类似的方法）
  const handleParamValueChange = (path: string[], value: any) => {
    setWorkflowInputs((prev) => {
      const newValues = { ...prev } as Record<string, unknown>;
      let current: any = newValues;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;

      // 直接更新存储中的工作流输入参数
      if (currentSchedule?.id) {
        Scheduler.update(currentSchedule.id, {
          workflowInputs: newValues,
        });
      }

      return newValues;
    });
  };

  // 处理计划类型变更
  const handleTypeChange = (type: "workflow" | "plugin" | "agent") => {
    if (!currentSchedule?.id) return;

    // 如果当前计划已启用，先停止定时任务
    if (currentSchedule.enabled) {
      Scheduler.cancel(currentSchedule.id);
    }

    // 重置所有ID字段
    const update: Partial<Schedule> = {
      type,
      workflowId: undefined,
      pluginId: undefined,
      agentId: undefined,
      enabled: false, // 更改类型后，默认为禁用状态
    };

    // 更新存储中的计划
    Scheduler.update(currentSchedule.id, update);
  };

  // 处理工作流选择变更
  const handleWorkflowChange = (workflowId: string) => {
    if (!currentSchedule?.id) return;

    // 如果当前计划已启用，先停止定时任务
    if (currentSchedule.enabled) {
      Scheduler.cancel(currentSchedule.id);
    }

    // 更新存储中的计划
    Scheduler.update(currentSchedule.id, {
      workflowId,
      workflowInputs: {}, // 重置工作流输入参数
      enabled: false, // 更改工作流后，默认为禁用状态
    });
  };

  // 处理插件选择变更
  const handlePluginChange = (pluginId: string) => {
    if (!currentSchedule?.id) return;

    // 如果当前计划已启用，先停止定时任务
    if (currentSchedule.enabled) {
      Scheduler.cancel(currentSchedule.id);
    }

    // 更新存储中的计划
    Scheduler.update(currentSchedule.id, {
      pluginId,
      pluginParams: {}, // 重置插件参数
      enabled: false, // 更改插件后，默认为禁用状态
    });
  };

  // 处理代理选择变更
  const handleAgentChange = (agentId: string) => {
    if (!currentSchedule?.id) return;

    // 如果当前计划已启用，先停止定时任务
    if (currentSchedule.enabled) {
      Scheduler.cancel(currentSchedule.id);
    }

    // 更新存储中的计划
    Scheduler.update(currentSchedule.id, {
      agentId,
      enabled: false, // 更改代理后，默认为禁用状态
    });
  };

  // 清空执行历史
  const handleClearHistory = () => {
    if (!currentSchedule?.id) return;

    dialog.confirm({
      title: "清空执行历史",
      content: "确定要清空此计划的所有执行历史记录吗？",
      okText: "确定",
      cancelText: "取消",
      onOk() {
        Scheduler.clearHistory(currentSchedule.id);
      },
    });
  };

  // 格式化结果
  const formatResult = (result: any) => {
    if (result === null || result === undefined) return "无结果";

    try {
      if (typeof result === "object") {
        return JSON.stringify(result, null, 2);
      }
      return String(result);
    } catch (error) {
      return "结果无法显示";
    }
  };

  // 获取插件的工具和参数
  const getSelectedPluginTool = () => {
    if (!currentSchedule?.pluginId) return null;

    const plugin = plugins[currentSchedule.pluginId];
    if (!plugin || !plugin.tools || plugin.tools.length === 0) return null;

    // 默认返回第一个工具
    return plugin.tools[0];
  };

  // 渲染计划列表项
  const renderScheduleItem = (schedule: Schedule) => {
    const isRunning = Scheduler.isEnabled(schedule.id);

    return {
      id: schedule.id,
      content: (
        <div className="flex items-center gap-2">
          {schedule.name || "未命名计划"}
          {isRunning && (
            <div
              className="w-2 h-2 bg-green-500 rounded-full"
              title="已启用"
            ></div>
          )}
        </div>
      ),
      onClick: () => {
        setSelectedSchedule(schedule.id);
        HistoryStore.indexed({
          database: SCHEDULE_HISTORY_DATABASE,
          name: schedule.id,
        });
      },
      actived: selectedSchedule === schedule.id,
      onRemove: () => {
        dialog.confirm({
          title: "删除计划",
          content: `确定要删除计划 ${schedule.name} 吗？`,
          onOk() {
            Scheduler.cancel(schedule.id);
            Scheduler.delete(schedule.id);
            if (selectedSchedule === schedule.id) {
              setSelectedSchedule("");
            }
          },
        });
      },
    };
  };

  // 获取当前计划是否可启用
  const canEnableSchedule = () => {
    if (!currentSchedule) return false;

    switch (currentSchedule.type) {
      case "workflow":
        return !!currentSchedule.workflowId;
      case "plugin":
        return !!currentSchedule.pluginId;
      case "agent":
        return !!currentSchedule.agentId;
      default:
        return false;
    }
  };

  // 获取当前计划类型的提示信息
  const getScheduleTypeHint = () => {
    if (!currentSchedule) return "";

    switch (currentSchedule.type) {
      case "workflow":
        return !currentSchedule.workflowId
          ? "请先选择一个工作流才能启用计划"
          : "";
      case "plugin":
        return !currentSchedule.pluginId ? "请先选择一个插件才能启用计划" : "";
      case "agent":
        return !currentSchedule.agentId ? "请先选择一个代理才能启用计划" : "";
      default:
        return "";
    }
  };

  // 渲染执行历史记录
  const renderHistory = (history: Record<string, ExecutionHistory>) => {
    if (Object.keys(history).length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
          <TbHistory className="w-10 h-10 mb-4" />
          <p>暂无执行历史记录</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2 overflow-y-auto">
          {Object.values(history)
            .reverse()
            .map((item, index) => (
              <Collapsible
                key={index}
                open={expandedItems[index]}
                onOpenChange={() => toggleExpandItem(index)}
                className="border rounded-md overflow-hidden mb-2 bg-white/50"
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex justify-between items-center p-3 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedItems[index] ? (
                          <TbChevronDown className="w-4 h-4" />
                        ) : (
                          <TbChevronRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="font-medium flex items-center">
                        <span className="inline-block px-2 py-0.5 text-xs rounded mr-2 bg-slate-100">
                          {item.type === "workflow" && "工作流"}
                          {item.type === "plugin" && "插件"}
                          {item.type === "agent" && "代理"}
                        </span>
                        <span className="truncate max-w-[180px]">
                          {item.targetName || item.targetId}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center text-xs px-2 py-0.5 rounded ${item.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        {item.success ? "成功" : "失败"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(item.timestamp),
                          "yyyy-MM-dd HH:mm:ss",
                        )}
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 border-t bg-slate-50/70 space-y-3">
                    {item.error && (
                      <div className="p-2 bg-red-50 border border-red-100 rounded text-sm text-red-700">
                        <div className="font-medium mb-1">错误信息：</div>
                        <div>{item.error}</div>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm mb-1">执行结果：</div>
                      <div className="p-2 bg-white rounded border text-sm font-mono overflow-auto max-h-[200px]">
                        <pre className="whitespace-pre-wrap break-words">
                          {formatResult(item.result)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
        </div>
      </div>
    );
  };

  // 渲染单个参数输入项（类似于ExecuteDrawer.tsx中的方法）
  const renderParamInput = (
    name: string,
    property: ToolProperty,
    path: string[] = [],
    required: boolean = false,
  ) => {
    const currentPath = [...path, name];
    // 使用类型安全的方式获取嵌套值
    const getCurrentValue = (obj: Record<string, any>, keys: string[]) => {
      let current = obj;
      for (const key of keys) {
        if (current?.[key] === undefined) return undefined;
        current = current[key];
      }
      return current;
    };

    const currentValue = getCurrentValue(
      workflowInputs as Record<string, any>,
      currentPath,
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
  };

  return (
    <PreferenceLayout>
      <PreferenceList
        right={
          <>
            <Button className="flex-1" onClick={handleCreate}>
              <TbScriptPlus className="w-4 h-4" />
              新建
            </Button>
          </>
        }
        items={Object.values(schedulesData).map(renderScheduleItem)}
        emptyText="暂无计划，点击上方按钮添加新计划"
        EmptyIcon={TbPlus}
      />
      <motion.div
        layout
        className={cn("flex flex-1 flex-col h-full overflow-hidden px-3")}
        initial={false}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        <PreferenceBody
          emptyText="请选择一个计划或点击添加按钮创建新计划"
          EmptyIcon={TbPlug}
          isEmpty={!currentSchedule?.id}
          className={cn("rounded-xl flex-1")}
          header={
            <div className="flex items-center justify-between w-full">
              <Input
                variant="title"
                value={currentSchedule?.name}
                onChange={handleNameChange}
                placeholder="输入计划名称"
                className="resize-none"
              />

              {currentSchedule?.id && (
                <div className="flex flex-none items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    {currentSchedule.enabled ? "已启用" : "已禁用"}
                  </div>
                  <Switch
                    checked={!!currentSchedule.enabled}
                    onCheckedChange={handleScheduleEnabledChange}
                    disabled={!canEnableSchedule()}
                  />
                </div>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setHistoryDrawerOpen(true)}
              >
                <TbHistory className="w-4 h-4" />
                历史
              </Button>
              <Drawer
                direction="right"
                open={historyDrawerOpen}
                onOpenChange={setHistoryDrawerOpen}
                className="w-[480px]"
                title={
                  <div className="p-2 flex justify-between">
                    <h3 className="text-lg font-semibold">执行历史记录</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearHistory}
                    >
                      <TbTrash className="w-4 h-4" />
                      清空历史
                    </Button>
                  </div>
                }
              >
                {renderHistory(history)}
              </Drawer>
            </div>
          }
        >
          {currentSchedule?.id && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-2">
                <div className="space-y-4">
                  <CronInput
                    value={currentSchedule.cron}
                    onChange={handleCronExpressionChange}
                  />
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="space-y-4">
                      {/* 计划类型选择 */}
                      <div className="space-y-4">
                        <Label>计划类型</Label>
                        <DrawerSelector
                          title="选择计划类型"
                          value={[currentSchedule.type]}
                          items={[
                            {
                              label: "工作流",
                              value: "workflow",
                            },
                            {
                              label: "插件",
                              value: "plugin",
                            },
                            {
                              label: "代理",
                              value: "agent",
                            },
                          ]}
                          onSelect={([value]) => handleTypeChange(value)}
                        />
                      </div>

                      {/* 根据计划类型显示不同的选择器 */}
                      {currentSchedule.type === "workflow" && (
                        <div className="space-y-4">
                          <Label>选择执行的工作流</Label>
                          <DrawerSelector
                            title="选择执行的工作流"
                            value={[currentSchedule?.workflowId]}
                            items={Object.values(workflows).map((workflow) => {
                              return {
                                label: workflow.name,
                                value: workflow.id,
                              };
                            })}
                            onSelect={([value]) => handleWorkflowChange(value)}
                          />

                          {currentSchedule.workflowId && (
                            <div className="space-y-4">
                              <div className="text-sm font-medium">
                                工作流输入参数
                              </div>

                              {isLoadingParams && (
                                <div className="text-center text-muted-foreground py-4">
                                  加载参数定义中...
                                </div>
                              )}

                              {!isLoadingParams && !workflowParams && (
                                <div className="text-center text-muted-foreground py-4">
                                  该工作流没有定义输入参数
                                </div>
                              )}

                              {!isLoadingParams &&
                                workflowParams?.properties && (
                                  <div className="space-y-4 max-h-[300px] overflow-y-auto p-2 border rounded-md">
                                    {Object.entries(
                                      workflowParams.properties || {},
                                    ).map(([name, prop]) => {
                                      return renderParamInput(
                                        name,
                                        prop as ToolProperty,
                                        [],
                                        (Array.isArray(
                                          workflowParams.required,
                                        ) &&
                                          workflowParams.required.includes(
                                            name,
                                          )) ||
                                          false,
                                      );
                                    })}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      )}

                      {currentSchedule.type === "plugin" && (
                        <div className="space-y-4">
                          <Label>选择执行的插件</Label>
                          <DrawerSelector
                            title="选择执行的插件"
                            value={[currentSchedule?.pluginId]}
                            items={Object.values(plugins).map((plugin) => {
                              return {
                                label: plugin.name,
                                value: plugin.id,
                              };
                            })}
                            onSelect={([value]) => handlePluginChange(value)}
                          />

                          {currentSchedule.pluginId && (
                            <div className="space-y-4">
                              <div className="text-sm font-medium">
                                插件参数
                              </div>
                              {(() => {
                                const selectedTool = getSelectedPluginTool();
                                if (!selectedTool || !selectedTool.parameters) {
                                  return (
                                    <div className="text-center text-muted-foreground py-4">
                                      该插件没有定义参数
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-4 max-h-[300px] overflow-y-auto p-2 border rounded-md">
                                    {Object.entries(
                                      selectedTool.parameters.properties || {},
                                    ).map(([key, property]) => (
                                      <ParamInput
                                        key={key}
                                        name={key}
                                        property={property as ToolProperty}
                                        value={pluginParams[key]}
                                        onChange={(value) =>
                                          handlePluginParamChange(key, value)
                                        }
                                      />
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {currentSchedule.type === "agent" && (
                        <>
                          <div className="space-y-4">
                            <Label>选择执行的代理</Label>
                            <DrawerSelector
                              title="选择执行的代理"
                              value={[currentSchedule?.agentId]}
                              items={Object.values(agents).map((agent) => {
                                return {
                                  label: agent.name,
                                  value: agent.id,
                                };
                              })}
                              onSelect={([value]) => handleAgentChange(value)}
                            />
                          </div>

                          <div className="space-y-4">
                            <Label>代理输入内容</Label>
                            <AutoResizeTextarea
                              placeholder="输入要发送给代理的内容，默认为'定时任务自动触发'"
                              value={currentSchedule.agentInput || ""}
                              onValueChange={handleAgentInputChange}
                            />
                          </div>
                        </>
                      )}

                      {getScheduleTypeHint() && (
                        <div className="text-sm text-amber-500">
                          {getScheduleTypeHint()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </PreferenceBody>
      </motion.div>
    </PreferenceLayout>
  );
};
