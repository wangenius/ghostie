import { Button } from "@/components/ui/button";
import { ModelManager } from "@/model/ModelManager";
import { gen } from "@/utils/generator";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbPlus, TbRobot, TbUpload } from "react-icons/tb";

import { defaultBot, TOOL_NAME_SPLIT } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { BotProps } from "@/common/types/bot";
import { ModelType } from "@/common/types/model";
import { PluginProps, ToolProps } from "@/common/types/plugin";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Knowledge, KnowledgeStore } from "@/knowledge/KnowledgeStore";
import { WorkflowManager } from "@/workflow/WorkflowManager";
import { WorkflowProps } from "@/workflow/types/nodes";
import { useCallback, useEffect, useState } from "react";

/** 机器人列表 */
export function BotsTab() {
  const bots = BotManager.use();
  const models = ModelManager.use();
  const knowledge = KnowledgeStore.use();
  const workflows = WorkflowManager.use();
  const [selectedBot, setSelectedBot] = useState<BotProps | undefined>();
  const [plugins, setPlugins] = useState<Record<string, PluginProps>>({});

  // 自动保存功能
  useEffect(() => {
    if (selectedBot?.id) {
      try {
        BotManager.update(selectedBot);
      } catch (error) {
        console.error("更新助手失败:", error);
      }
    }
  }, [selectedBot]);

  const loadPlugins = useCallback(async () => {
    const tools = await cmd.invoke<Record<string, PluginProps>>("plugins_list");
    setPlugins(tools);
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const handleCreateBot = () => {
    try {
      const id = gen.id();
      const newBot = { ...defaultBot, id };
      BotManager.add(newBot);
      setSelectedBot(newBot);
    } catch (error) {
      console.error("添加助手失败:", error);
    }
  };

  const handleDeleteBot = async (id: string) => {
    const answer = await cmd.confirm(`确定要删除助手 "${bots[id].name}" 吗？`);
    if (answer) {
      try {
        BotManager.remove(id);
        if (selectedBot?.id === id) {
          setSelectedBot(undefined);
        }
      } catch (error) {
        console.error("删除助手失败:", error);
      }
    }
  };

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "选择助手配置文件",
          filters: {
            助手配置: ["json"],
          },
        },
      );

      if (result) {
        BotManager.import(result.content);
        await cmd.message("成功导入助手配置", "导入成功");
      }
    } catch (error) {
      console.error("导入助手失败:", error);
      await cmd.message(`导入助手失败: ${error}`, "导入失败");
    }
  };

  const handleExport = async () => {
    try {
      const botsJson = BotManager.export();
      const result = await cmd.invoke<boolean>("save_file", {
        title: "保存助手配置",
        filters: {
          助手配置: ["json"],
        },
        defaultName: "bots.json",
        content: botsJson,
      });

      if (result) {
        await cmd.message("成功导出助手配置", "导出成功");
      }
    } catch (error) {
      console.error("导出助手失败:", error);
      await cmd.message(`导出助手失败: ${error}`, "导出失败");
    }
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
        left={
          <Button
            onClick={() => {
              window.open(
                "https://ccn0kkxjz1z2.feishu.cn/wiki/CNUbwM7xSizLoWk95Cuc3XgKnsf?from=from_copylink",
                "_blank",
              );
            }}
            variant="outline"
          >
            <PiStorefrontDuotone className="w-4 h-4" />
            助手仓库
          </Button>
        }
        right={
          <>
            {" "}
            <Button className="flex-1" onClick={handleCreateBot}>
              <TbPlus className="w-4 h-4" />
              添加助手
            </Button>{" "}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImport}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>导入</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>导出</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        items={Object.entries(bots).map(([id, bot]) => ({
          id,
          title: bot.name || "未命名助手",
          description: bot.system?.slice(0, 50) || "暂无提示词",
          onClick: () => setSelectedBot(bot),
          actived: selectedBot?.id === id,
          onRemove: () => handleDeleteBot(id),
        }))}
        emptyText="请选择一个助手或点击添加按钮创建新助手"
        EmptyIcon={TbRobot}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="请选择一个助手或点击添加按钮创建新助手"
        EmptyIcon={TbRobot}
        isEmpty={!selectedBot}
      >
        {selectedBot && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-3xl mx-auto">
              {/* 顶部标题区域 */}
              <div className="mb-10">
                <Input
                  type="text"
                  variant="title"
                  spellCheck={false}
                  value={selectedBot?.name || ""}
                  onChange={(e) =>
                    setSelectedBot(
                      selectedBot
                        ? { ...selectedBot, name: e.target.value }
                        : undefined,
                    )
                  }
                  placeholder="为你的助手起个名字"
                  className="w-full text-2xl font-medium tracking-tight"
                />
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  {/* 模型选择 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      选择模型
                    </label>
                    <Select
                      value={selectedBot.model}
                      onValueChange={(value) =>
                        setSelectedBot(
                          selectedBot
                            ? { ...selectedBot, model: value }
                            : undefined,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(models)
                          .filter((model) => model.type === ModelType.TEXT)
                          .map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name + ":" + model.model}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 模式选择 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      选择模式
                    </label>
                    <Select
                      value={selectedBot.mode}
                      onValueChange={(value) =>
                        setSelectedBot(
                          selectedBot
                            ? {
                                ...selectedBot,
                                mode: value as "react" | "plan",
                              }
                            : undefined,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请选择模式" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { key: "react", label: "ReAct" },
                          {
                            key: "plan",
                            label: (
                              <span className="flex items-center text-red-500">
                                Plan&Execute(实验性)
                              </span>
                            ),
                          },
                        ].map((mode) => (
                          <SelectItem key={mode.key} value={mode.key}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 温度设置 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      选择温度
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {selectedBot.temperature}
                    </span>
                  </div>
                  <Slider
                    value={[selectedBot.temperature]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueChange={(value) =>
                      setSelectedBot(
                        selectedBot
                          ? {
                              ...selectedBot,
                              temperature: value[0],
                            }
                          : undefined,
                      )
                    }
                    className="py-2"
                  />
                </div>

                {/* 插件选择 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    选择插件
                  </label>
                  <MultiSelect
                    options={Object.values(plugins).flatMap(
                      (plugin: PluginProps) =>
                        plugin.tools.map((tool: ToolProps) => ({
                          label: "[" + plugin.name + "]" + tool.name,
                          value: tool.name + TOOL_NAME_SPLIT + plugin.id,
                        })),
                    )}
                    value={selectedBot.tools}
                    onChange={(value) =>
                      setSelectedBot(
                        selectedBot
                          ? { ...selectedBot, tools: value }
                          : undefined,
                      )
                    }
                    className="bg-secondary/50 hover:bg-secondary/70 transition-colors"
                    placeholder="选择插件..."
                  />
                </div>

                {/* 工作流选择 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    选择工作流
                  </label>
                  <MultiSelect
                    options={Object.values(workflows).map(
                      (workflow: WorkflowProps) => ({
                        label: workflow.name,
                        value: workflow.id,
                      }),
                    )}
                    value={selectedBot.workflows || []}
                    onChange={(value) =>
                      setSelectedBot(
                        selectedBot
                          ? {
                              ...selectedBot,
                              workflows: value,
                            }
                          : undefined,
                      )
                    }
                    className="bg-secondary/50 hover:bg-secondary/70 transition-colors"
                    placeholder="选择工作流..."
                  />
                </div>

                {/* 知识库选择 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    选择知识库
                  </label>
                  <MultiSelect
                    options={Object.values(knowledge).map(
                      (knowledge: Knowledge) => ({
                        label: knowledge.name + "(" + knowledge.version + ")",
                        value: knowledge.id,
                      }),
                    )}
                    value={selectedBot.knowledges || []}
                    onChange={(value) =>
                      setSelectedBot(
                        selectedBot
                          ? {
                              ...selectedBot,
                              knowledges: value,
                            }
                          : undefined,
                      )
                    }
                    className="bg-secondary/50 hover:bg-secondary/70 transition-colors"
                    placeholder="选择知识库..."
                  />
                </div>

                {/* 助手提示词 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    助手提示词
                  </label>
                  <Textarea
                    value={selectedBot.system}
                    onChange={(e) =>
                      setSelectedBot(
                        selectedBot
                          ? {
                              ...selectedBot,
                              system: e.target.value,
                            }
                          : undefined,
                      )
                    }
                    className="w-full h-56 bg-secondary/50 hover:bg-secondary/70 transition-colors rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground resize-none p-4"
                    placeholder="请输入助手提示词"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </PreferenceBody>
    </PreferenceLayout>
  );
}
