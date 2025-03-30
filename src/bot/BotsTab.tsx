import { Button } from "@/components/ui/button";
import { ModelManager } from "@/model/ModelManager";
import { gen } from "@/utils/generator";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbPlus, TbRobot, TbUpload } from "react-icons/tb";

import { defaultBot, TOOL_NAME_SPLIT } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { BotProps } from "@/common/types/bot";
import { ModelType } from "@/model/types/model";
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
import { Knowledge, KnowledgeMeta } from "@/knowledge/Knowledge";
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
        console.error("update bot error:", error);
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
      console.error("add bot error:", error);
    }
  };

  const handleDeleteBot = async (id: string) => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the assistant "${bots[id].name}"?`,
    );
    if (answer) {
      try {
        BotManager.remove(id);
        if (selectedBot?.id === id) {
          setSelectedBot(undefined);
        }
      } catch (error) {
        console.error("delete bot error:", error);
      }
    }
  };

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "Select Assistant Configuration File",
          filters: {
            助手配置: ["json"],
          },
        },
      );

      if (result) {
        BotManager.import(result.content);
        await cmd.message(
          "Successfully imported assistant configuration",
          "import success",
        );
      }
    } catch (error) {
      console.error("import bot error:", error);
      await cmd.message(`import bot error: ${error}`, "import failed");
    }
  };

  const handleExport = async () => {
    try {
      const botsJson = BotManager.export();
      const result = await cmd.invoke<boolean>("save_file", {
        title: "Save Assistant Configuration",
        filters: {
          助手配置: ["json"],
        },
        defaultName: "bots.json",
        content: botsJson,
      });

      if (result) {
        await cmd.message(
          "Successfully exported assistant configuration",
          "export success",
        );
      }
    } catch (error) {
      console.error("export bot error:", error);
      await cmd.message(`export bot error: ${error}`, "export failed");
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
            Bots Market
          </Button>
        }
        right={
          <>
            <Button className="flex-1" onClick={handleCreateBot}>
              <TbPlus className="w-4 h-4" />
              Add Bot
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
                  <span>Import</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>Export</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        items={Object.entries(bots).map(([id, bot]) => ({
          id,
          title: (
            <span className="flex items-center">
              <span>{bot.name || "Unnamed Bot"}</span>
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
          description: bot.system?.slice(0, 50) || "No prompt",
          onClick: () => setSelectedBot(bot),
          actived: selectedBot?.id === id,
          onRemove: () => handleDeleteBot(id),
        }))}
        emptyText="Please select an assistant or click the add button to create a new assistant"
        EmptyIcon={TbRobot}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="Please select an assistant or click the add button to create a new assistant"
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
  const { list } = Knowledge.useList();
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
          placeholder="Assistant Name"
          className="text-xl border-none bg-transparent w-[300px] focus-visible:ring-0"
        />
      </div>

      {/* 主内容区 */}
      <div className="px-8 py-8">
        <div className="space-y-6">
          <DrawerSelector
            title="Agent Mode"
            value={[bot.mode]}
            items={[
              { label: "ReAct", value: "ReAct" },
              {
                label: "Plan&Execute",
                value: "Plan&Execute",
                variant: "danger",
                description: "Experimental",
              },
            ]}
            onSelect={([value]) =>
              setBot(bot ? { ...bot, mode: value } : undefined)
            }
          />

          {/* 模型部分 */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium">Model</h3>

            <DrawerSelector
              title="Text Model"
              value={bot.model ? [bot.model] : []}
              items={getModelItems(ModelType.TEXT)}
              onSelect={([value]) =>
                setBot(bot ? { ...bot, model: value } : undefined)
              }
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted-foreground">
                  Temperature
                </label>
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
            <h3 className="text-lg font-medium">System Prompt</h3>
            <AutoResizeTextarea
              value={bot.system}
              onValueChange={(e) =>
                setBot(bot ? { ...bot, system: e.target.value } : undefined)
              }
              className="resize-none"
              placeholder="Please enter the system prompt..."
            />
          </section>

          {/* 功能扩展 */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium">Function Extensions</h3>
            <div className="space-y-4">
              <DrawerSelector
                title="Select Plugin"
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
                placeholder="Select Plugin..."
              />

              <DrawerSelector
                title="Select Workflow"
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
                placeholder="Select Workflow..."
              />

              <DrawerSelector
                title="Select Knowledge"
                value={bot.knowledges || []}
                items={Object.values(list).map((k: KnowledgeMeta) => ({
                  label: k.name + "(" + k.version + ")",
                  value: k.id,
                }))}
                onSelect={(value) =>
                  setBot(bot ? { ...bot, knowledges: value } : undefined)
                }
                multiple
                placeholder="Select Knowledge..."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
