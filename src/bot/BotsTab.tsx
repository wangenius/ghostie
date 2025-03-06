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
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Knowledge, KnowledgeStore } from "@/knowledge/KnowledgeStore";
import { getColor } from "@/utils/color";
import { WorkflowManager } from "@/workflow/WorkflowManager";
import { WorkflowProps } from "@/workflow/types/nodes";
import { useCallback, useEffect, useState } from "react";

/** 机器人列表 */
export function BotsTab() {
  const bots = BotManager.use();

  const [selectedBot, setSelectedBot] = useState<BotProps | undefined>();

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
              cmd.invoke("open_url", {
                url: "https://ghostie.wangenius.com/resources/bots",
              });
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
          title: (
            <span className="flex items-center">
              <span>{bot.name || "未命名助手"}</span>
              <small
                className="ml-2 text-[10px] text-muted bg-primary/80 px-2 rounded-xl"
                style={{
                  backgroundColor: getColor(bot.mode),
                }}
              >
                {bot.mode}
              </small>
            </span>
          ),
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
        {selectedBot && <BotItem bot={selectedBot} setBot={setSelectedBot} />}
      </PreferenceBody>
    </PreferenceLayout>
  );
}

const BotItem = ({
  bot,
  setBot,
}: {
  bot: BotProps;
  setBot: (bot: BotProps | undefined) => void;
}) => {
  const [plugins, setPlugins] = useState<Record<string, PluginProps>>({});

  const models = ModelManager.use();
  const knowledge = KnowledgeStore.use();
  const workflows = WorkflowManager.use();

  const loadPlugins = useCallback(async () => {
    const tools = await cmd.invoke<Record<string, PluginProps>>("plugins_list");
    setPlugins(tools);
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // 转换模型数据为选择器项目
  const getModelItems = (type: ModelType) => {
    return Object.values(models)
      .filter((model) => model.type === type)
      .map((model) => ({
        label: model.name,
        value: model.id,
        description: model.model,
      }));
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 顶部名称栏 */}
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-8">
        <Input
          type="text"
          value={bot?.name || ""}
          onChange={(e) =>
            setBot(bot ? { ...bot, name: e.target.value } : undefined)
          }
          placeholder="助手名称"
          className="text-xl border-none bg-transparent w-[300px] focus-visible:ring-0"
        />
      </div>

      {/* 主内容区 */}
      <div className="px-8 py-8">
        <div className="space-y-6">
          <DrawerSelector
            title="Agent模式"
            value={[bot.mode]}
            items={[
              { label: "ReAct", value: "ReAct" },
              {
                label: "Plan&Execute",
                value: "Plan&Execute",
                variant: "danger",
                description: "实验性",
              },
            ]}
            onSelect={([value]) =>
              setBot(bot ? { ...bot, mode: value } : undefined)
            }
          />

          {/* 模型部分 */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium">模型</h3>

            <DrawerSelector
              title="文本模型"
              value={bot.model ? [bot.model] : []}
              items={getModelItems(ModelType.TEXT)}
              onSelect={([value]) =>
                setBot(bot ? { ...bot, model: value } : undefined)
              }
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted-foreground">温度</label>
                <span className="text-sm tabular-nums">
                  {bot.temperature?.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[bot.temperature]}
                min={0}
                max={2}
                step={0.1}
                className="px-1"
                onValueChange={(value) =>
                  setBot(bot ? { ...bot, temperature: value[0] } : undefined)
                }
              />
            </div>
          </section>

          {/* 系统提示词 */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">系统提示词</h3>
            <AutoResizeTextarea
              value={bot.system}
              onValueChange={(e) =>
                setBot(bot ? { ...bot, system: e.target.value } : undefined)
              }
              className="resize-none"
              placeholder="请输入系统提示词..."
            />
          </section>

          {/* 功能扩展 */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium">功能扩展</h3>
            <div className="space-y-4">
              <DrawerSelector
                title="选择插件"
                value={bot.tools}
                items={Object.values(plugins).flatMap((plugin: PluginProps) =>
                  plugin.tools.map((tool: ToolProps) => ({
                    label: tool.name,
                    value: tool.name + TOOL_NAME_SPLIT + plugin.id,
                    type: plugin.name,
                    description: tool.description,
                  })),
                )}
                onSelect={(value) =>
                  setBot(bot ? { ...bot, tools: value } : undefined)
                }
                multiple
                placeholder="选择插件..."
              />

              <DrawerSelector
                title="选择工作流"
                value={bot.workflows || []}
                items={Object.values(workflows).map(
                  (workflow: WorkflowProps) => ({
                    label: workflow.name,
                    value: workflow.id,
                    description: workflow.description,
                  }),
                )}
                onSelect={(value) =>
                  setBot(bot ? { ...bot, workflows: value } : undefined)
                }
                multiple
                placeholder="选择工作流..."
              />

              <DrawerSelector
                title="选择知识库"
                value={bot.knowledges || []}
                items={Object.values(knowledge).map((k: Knowledge) => ({
                  label: k.name + "(" + k.version + ")",
                  value: k.id,
                }))}
                onSelect={(value) =>
                  setBot(bot ? { ...bot, knowledges: value } : undefined)
                }
                multiple
                placeholder="选择知识库..."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
