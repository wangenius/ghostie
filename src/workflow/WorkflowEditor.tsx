import { LoadingSpin } from "@/components/custom/LoadingSpin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cmd } from "@/utils/shell";
import { debounce } from "lodash";
import { memo, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { TbBook, TbLoader2, TbPencil, TbPlayerPlay, TbX } from "react-icons/tb";
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
import { NodeType } from "./types/nodes";
import { Workflow } from "./Workflow";

type FrequencyType = "minute" | "hour" | "day" | "week" | "custom";

interface FrequencyConfig {
  type: FrequencyType;
  interval?: number;
  times?: Array<{ hour: string; minute: string }>;
  hour?: string;
  minute?: string;
  weekdays?: number[];
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
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [frequency, setFrequency] = useState<FrequencyConfig>({
    type: "day",
    hour: "00",
    minute: "00",
  });

  // 打开编辑抽屉时初始化数据
  const handleOpenEdit = useCallback(() => {
    setEditName(workflowState?.data.name || "");
    setEditDescription(workflowState?.data.description || "");
    setScheduleEnabled(workflowState?.data.schedule?.enabled || false);

    // 解析现有的 cron 表达式
    const currentCron = workflowState?.data.schedule?.cron;
    if (currentCron) {
      const [minute, hour, _day, _month, weekday] = currentCron.split(" ");

      // 解析频率类型和配置
      if (minute === "*" && hour === "*") {
        setFrequency({ type: "minute", interval: 1 });
      } else if (minute.includes("/")) {
        setFrequency({
          type: "minute",
          interval: parseInt(minute.split("/")[1]),
        });
      } else if (hour === "*" && minute !== "*") {
        setFrequency({ type: "hour", minute });
      } else if (weekday !== "*") {
        setFrequency({
          type: "week",
          hour: hour === "*" ? "00" : hour,
          minute: minute === "*" ? "00" : minute,
          weekdays: weekday.split(",").map(Number),
        });
      } else {
        setFrequency({
          type: "day",
          hour: hour === "*" ? "00" : hour,
          minute: minute === "*" ? "00" : minute,
        });
      }
    }

    setIsEditDrawerOpen(true);
  }, [
    workflowState?.data.name,
    workflowState?.data.description,
    workflowState?.data.schedule,
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

  // 更新定时配置
  const updateSchedule = useCallback(
    (newFrequency: FrequencyConfig) => {
      let cronExpression = "";

      switch (newFrequency.type) {
        case "minute":
          cronExpression =
            newFrequency.interval && newFrequency.interval > 1
              ? `*/${newFrequency.interval} * * * *`
              : "* * * * *";
          break;
        case "hour":
          cronExpression = `${newFrequency.minute || "0"} * * * *`;
          break;
        case "day":
          if (newFrequency.times && newFrequency.times.length > 0) {
            // 多个时间点的情况
            const timeExpressions = newFrequency.times.map(
              (time) => `${time.minute} ${time.hour} * * *`,
            );
            cronExpression = timeExpressions.join("\n");
          } else {
            // 单个时间点的情况
            cronExpression = `${newFrequency.minute || "0"} ${
              newFrequency.hour || "0"
            } * * *`;
          }
          break;
        case "week":
          cronExpression = `${newFrequency.minute || "0"} ${
            newFrequency.hour || "0"
          } * * ${
            newFrequency.weekdays?.length
              ? newFrequency.weekdays.sort((a, b) => a - b).join(",")
              : "*"
          }`;
          break;
        case "custom":
          cronExpression = `${newFrequency.minute || "0"} ${
            newFrequency.hour || "0"
          } * * ${
            newFrequency.weekdays?.length
              ? newFrequency.weekdays.sort((a, b) => a - b).join(",")
              : "*"
          }`;
          break;
      }

      workflow.set((state) => ({
        ...state,
        data: {
          ...state.data,
          schedule: {
            ...state.data.schedule,
            enabled: true,
            cron: cronExpression,
          },
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
        updateSchedule(frequency);
      } else {
        workflow.set((state) => ({
          ...state,
          data: {
            ...state.data,
            schedule: {
              ...state.data.schedule,
              enabled: false,
              cron: "",
            },
          },
        }));
      }
    },
    [workflow, frequency, updateSchedule],
  );

  // 处理频率类型变更
  const handleFrequencyTypeChange = useCallback(
    (type: FrequencyType) => {
      const newFrequency: FrequencyConfig = { type };

      // 保持原有的时间设置
      if (["day", "week", "custom"].includes(type)) {
        newFrequency.hour = frequency.hour || "00";
        newFrequency.minute = frequency.minute || "00";
        if (type === "week") {
          newFrequency.weekdays = frequency.weekdays || [];
        }
      } else if (type === "hour") {
        newFrequency.minute = frequency.minute || "00";
      } else if (type === "minute") {
        newFrequency.interval = 1;
      }

      setFrequency(newFrequency);
      updateSchedule(newFrequency);
    },
    [frequency, updateSchedule],
  );

  // 处理时间变更
  const handleTimeChange = useCallback(
    (type: "hour" | "minute", value: string) => {
      const newFrequency = {
        ...frequency,
        [type]: value,
      };
      setFrequency(newFrequency);
      updateSchedule(newFrequency);
    },
    [frequency, updateSchedule],
  );

  // 处理间隔变更
  const handleIntervalChange = useCallback(
    (value: string) => {
      const interval = parseInt(value);
      if (!isNaN(interval) && interval > 0) {
        const newFrequency = {
          ...frequency,
          interval,
        };
        setFrequency(newFrequency);
        updateSchedule(newFrequency);
      }
    },
    [frequency, updateSchedule],
  );

  // 处理星期选择
  const handleWeekdayToggle = useCallback(
    (day: number) => {
      const weekdays = frequency.weekdays || [];
      const newWeekdays = weekdays.includes(day)
        ? weekdays.filter((d) => d !== day)
        : [...weekdays, day];

      const newFrequency = {
        ...frequency,
        weekdays: newWeekdays,
      };
      setFrequency(newFrequency);
      updateSchedule(newFrequency);
    },
    [frequency, updateSchedule],
  );

  // 处理时间添加
  const handleAddTime = useCallback(() => {
    const newFrequency = {
      ...frequency,
      times: [...(frequency.times || []), { hour: "00", minute: "00" }],
    };
    setFrequency(newFrequency);
    updateSchedule(newFrequency);
  }, [frequency, updateSchedule]);

  // 处理时间删除
  const handleRemoveTime = useCallback(
    (index: number) => {
      const newTimes = [...(frequency.times || [])];
      newTimes.splice(index, 1);
      const newFrequency = {
        ...frequency,
        times: newTimes,
      };
      setFrequency(newFrequency);
      updateSchedule(newFrequency);
    },
    [frequency, updateSchedule],
  );

  // 处理时间更新
  const handleTimeUpdate = useCallback(
    (index: number, type: "hour" | "minute", value: string) => {
      const newTimes = [...(frequency.times || [])];
      newTimes[index] = {
        ...newTimes[index],
        [type]: value,
      };
      const newFrequency = {
        ...frequency,
        times: newTimes,
      };
      setFrequency(newFrequency);
      updateSchedule(newFrequency);
    },
    [frequency, updateSchedule],
  );

  const weekdayLabels = [
    "周日",
    "周一",
    "周二",
    "周三",
    "周四",
    "周五",
    "周六",
  ];

  // 获取当前配置的描述文本
  const getScheduleDescription = useCallback(() => {
    if (!scheduleEnabled) return "未启用定时执行";

    switch (frequency.type) {
      case "minute":
        return frequency.interval && frequency.interval > 1
          ? `每隔 ${frequency.interval} 分钟执行一次`
          : "每分钟执行一次";
      case "hour":
        return `每小时的 ${frequency.minute} 分执行`;
      case "day":
        if (frequency.times && frequency.times.length > 0) {
          return `每天 ${frequency.times
            .map((time) => `${time.hour}:${time.minute}`)
            .join("、")} 执行`;
        }
        return `每天 ${frequency.hour}:${frequency.minute} 执行`;
      case "week":
        return frequency.weekdays?.length
          ? `每${frequency.weekdays
              .sort((a, b) => a - b)
              .map((d) => weekdayLabels[d])
              .join("、")} ${frequency.hour}:${frequency.minute} 执行`
          : `每天 ${frequency.hour}:${frequency.minute} 执行`;
      default:
        return "自定义执行时间";
    }
  }, [frequency, scheduleEnabled, weekdayLabels]);

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
            <div className="space-y-6 p-4">
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
                            执行频率
                          </label>
                          <RadioGroup
                            value={frequency.type}
                            onValueChange={handleFrequencyTypeChange}
                            className="grid grid-cols-3 gap-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="minute" id="minute" />
                              <Label htmlFor="minute">每分钟</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="hour" id="hour" />
                              <Label htmlFor="hour">每小时</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="day" id="day" />
                              <Label htmlFor="day">每天</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="week" id="week" />
                              <Label htmlFor="week">每周</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {frequency.type === "minute" && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              执行间隔（分钟）
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="59"
                              value={frequency.interval || "1"}
                              onChange={(e) =>
                                handleIntervalChange(e.target.value)
                              }
                              className="w-24"
                            />
                          </div>
                        )}

                        {frequency.type === "hour" && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">分钟</label>
                            <Select
                              value={frequency.minute || "00"}
                              onValueChange={(v) =>
                                handleTimeChange("minute", v)
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="分" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 60 }).map((_, i) => (
                                  <SelectItem
                                    key={i}
                                    value={i.toString().padStart(2, "0")}
                                  >
                                    {i.toString().padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {frequency.type === "day" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                执行时间
                              </label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddTime}
                              >
                                添加时间
                              </Button>
                            </div>
                            {(frequency.times || []).length === 0 ? (
                              <div className="flex gap-2">
                                <Select
                                  value={frequency.hour || "00"}
                                  onValueChange={(v) =>
                                    handleTimeChange("hour", v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="时" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }).map((_, i) => (
                                      <SelectItem
                                        key={i}
                                        value={i.toString().padStart(2, "0")}
                                      >
                                        {i.toString().padStart(2, "0")}时
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={frequency.minute || "00"}
                                  onValueChange={(v) =>
                                    handleTimeChange("minute", v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="分" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 60 }).map((_, i) => (
                                      <SelectItem
                                        key={i}
                                        value={i.toString().padStart(2, "0")}
                                      >
                                        {i.toString().padStart(2, "0")}分
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {frequency.times?.map((time, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2"
                                  >
                                    <Select
                                      value={time.hour}
                                      onValueChange={(v) =>
                                        handleTimeUpdate(index, "hour", v)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="时" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 24 }).map(
                                          (_, i) => (
                                            <SelectItem
                                              key={i}
                                              value={i
                                                .toString()
                                                .padStart(2, "0")}
                                            >
                                              {i.toString().padStart(2, "0")}时
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={time.minute}
                                      onValueChange={(v) =>
                                        handleTimeUpdate(index, "minute", v)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="分" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 60 }).map(
                                          (_, i) => (
                                            <SelectItem
                                              key={i}
                                              value={i
                                                .toString()
                                                .padStart(2, "0")}
                                            >
                                              {i.toString().padStart(2, "0")}分
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveTime(index)}
                                    >
                                      <TbX className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {frequency.type === "week" && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">重复</label>
                            <div className="grid grid-cols-4 gap-2">
                              {weekdayLabels.map((label, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`day-${index}`}
                                    checked={frequency.weekdays?.includes(
                                      index,
                                    )}
                                    onCheckedChange={() =>
                                      handleWeekdayToggle(index)
                                    }
                                  />
                                  <label
                                    htmlFor={`day-${index}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground">
                          {getScheduleDescription()}
                        </p>
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
