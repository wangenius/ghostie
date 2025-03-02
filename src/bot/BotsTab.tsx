import { Button } from "@/components/ui/button";
import { ModelManager } from "@/model/ModelManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbPlus, TbTrash, TbUpload, TbRobot } from "react-icons/tb";
import { gen } from "@/utils/generator";

import { BotProps } from "@/common/types/bot";
import { ModelType } from "@/common/types/model";
import { PluginProps, ToolProps } from "@/common/types/plugin";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { defaultBot, TOOL_NAME_SPLIT } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { Knowledge, KnowledgeStore } from "@/knowledge/KnowledgeStore";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** 机器人列表 */
export function BotsTab() {
  const bots = BotManager.use();
  const models = ModelManager.use();
  const knowledge = KnowledgeStore.use();
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
    <div className="h-full flex overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-[400px] bg-muted flex flex-col h-full overflow-auto rounded-xl p-2 gap-2">
        <div className="flex-none flex justify-end items-center">
          <div className="flex items-center gap-2">
            <Button className="flex-1" onClick={handleCreateBot}>
              <TbPlus className="w-4 h-4 mr-2" />
              添加助手
            </Button>
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 p-1">
          {Object.entries(bots).map(([id, bot]) => (
            <div
              key={id}
              className={cn(
                "group relative px-4 py-3 rounded-lg transition-all hover:bg-muted-foreground/10 select-none",
                selectedBot?.id === id
                  ? "bg-primary/10 ring-1 ring-primary/20"
                  : "bg-background",
              )}
              onClick={() => {
                setSelectedBot(bot);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">
                      {bot.name || "未命名助手"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground truncate">
                    {bot.system?.slice(0, 50)}...
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBot(id);
                  }}
                >
                  <TbTrash className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧编辑区域 */}
      <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        {selectedBot ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="p-8">
                <div className="max-w-2xl mx-auto">
                  {/* 顶部标题区域 */}
                  <div className="mb-8">
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
                      className="w-full"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">基础配置</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">
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
                          <SelectTrigger>
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

                      <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">
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
                          <SelectTrigger>
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

                      <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">
                          选择温度
                        </label>
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
                        />
                        <div className="text-xs text-muted-foreground">
                          {selectedBot.temperature}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">
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
                          className="bg-secondary"
                          placeholder="选择插件..."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">
                          选择知识库
                        </label>
                        <MultiSelect
                          options={Object.values(knowledge).map(
                            (knowledge: Knowledge) => ({
                              label:
                                knowledge.name + "(" + knowledge.version + ")",
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
                          className="bg-secondary"
                          placeholder="选择知识库..."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">
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
                          className="w-full h-56 px-3 py-2 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground resize-none"
                          placeholder="请输入助手提示词"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
            <TbRobot className="w-12 h-12 text-muted-foreground/50" />
            <p>请选择一个助手或点击添加按钮创建新助手</p>
          </div>
        )}
      </div>
    </div>
  );
}
