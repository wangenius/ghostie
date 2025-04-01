import { Button } from "@/components/ui/button";
import { ChatModelManager } from "@/model/text/ChatModelManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbUpload } from "react-icons/tb";

import { TOOL_NAME_SPLIT } from "@/bot/Bot";
import { BotProps } from "@/bot/types/bot";
import { dialog } from "@/components/custom/DialogModal";
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
import { PluginProps, ToolProps } from "@/plugin/types/plugin";
import { supabase } from "@/utils/supabase";
import { Workflow } from "@/workflow/execute/Workflow";
import { useCallback, useEffect, useState } from "react";
export const BotEditor = ({
  bot,
  setBot,
}: {
  bot: BotProps;
  setBot: (bot: BotProps | undefined) => void;
}) => {
  const [plugins, setPlugins] = useState<Record<string, PluginProps>>({});
  const { list } = Knowledge.useList();
  const workflows = Workflow.list.use();

  const loadPlugins = useCallback(async () => {
    const tools = await cmd.invoke<Record<string, PluginProps>>("plugins_list");
    setPlugins(tools);
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // 上传机器人
  const handleUpload = useCallback(async () => {
    if (!bot.id) return;

    dialog.confirm({
      title: "Upload Bot",
      content: "Are you sure you want to upload this bot?",
      onOk: async () => {
        try {
          // 上传到 Supabase
          const { error } = await supabase.from("bots").insert({
            name: bot.name,
            system: bot.system,
            description: bot.description || bot.system,
          });

          if (error) throw error;

          cmd.message("Successfully uploaded bot to market", "success");
          cmd.invoke("close_modal");
        } catch (error) {
          console.error("Upload bot failed:", error);
          cmd.message(
            `Upload bot failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error",
          );
        }
      },
    });
  }, [bot]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 顶部名称栏 */}
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-8 gap-4 overflow-hidden flex-col">
        <div className="flex items-center justify-between w-full gap-4">
          <Input
            type="text"
            value={bot?.name || ""}
            onChange={(e) =>
              setBot(bot ? { ...bot, name: e.target.value } : undefined)
            }
            placeholder="Assistant Name"
            className="text-xl border-none bg-transparent focus-visible:ring-0"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <PiDotsThreeBold className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleUpload}>
                <TbUpload className="w-4 h-4 mr-2" />
                Upload Bot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
          <AutoResizeTextarea
            value={bot.description || ""}
            onValueChange={(e) =>
              setBot(bot ? { ...bot, description: e.target.value } : undefined)
            }
            className="resize-none"
            placeholder="Please enter the description..."
          />
          {/* 模型部分 */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium">Model</h3>

            <DrawerSelector
              title="Text Model"
              value={bot.model ? [bot.model] : []}
              items={Object.values(ChatModelManager.getProviders()).flatMap(
                (provider) => {
                  const key = ChatModelManager.getApiKey(provider.name);
                  if (!key) return [];
                  const models = provider.models;
                  return Object.values(models).map((model) => {
                    return {
                      label: model.name,
                      value: {
                        provider: provider.name,
                        name: model.name,
                      },
                      type: provider.name,
                      description: `${model.description}`,
                    };
                  });
                },
              )}
              onSelect={([value]) =>
                setBot({
                  ...bot,
                  model: value,
                })
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
                value={[bot.temperature || 0]}
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
                value={bot.tools || []}
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
                items={Object.values(workflows).map((workflow) => ({
                  label: workflow.name,
                  value: workflow.id,
                  description: workflow.description,
                }))}
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
