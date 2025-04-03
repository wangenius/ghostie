import { EngineManager } from "@/agent/engine/EngineManager";
import { TOOL_NAME_SPLIT } from "@/assets/const";
import { dialog } from "@/components/custom/DialogModal";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { Button } from "@/components/ui/button";
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
import { ChatModelManager } from "@/model/text/ChatModelManager";
import { PluginProps, ToolProps } from "@/plugin/plugin";
import { supabase } from "@/utils/supabase";
import { Workflow } from "@/workflow/execute/Workflow";
import { cmd } from "@utils/shell";
import { useCallback, useEffect, useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbUpload } from "react-icons/tb";
import { CurrentAgent } from "./AgentsTab";

export const AgentEditor = () => {
  const [plugins, setPlugins] = useState<Record<string, PluginProps>>({});
  const { list } = Knowledge.useList();
  const workflows = Workflow.list.use();
  const props = CurrentAgent.use();
  const engines = EngineManager.getEngines();

  const loadPlugins = useCallback(async () => {
    const tools = await cmd.invoke<Record<string, PluginProps>>("plugins_list");
    setPlugins(tools);
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // 上传机器人
  const handleUpload = useCallback(async () => {
    if (!props) return;

    dialog.confirm({
      title: "Upload Agent",
      content: "Are you sure you want to upload this agent?",
      onOk: async () => {
        try {
          // 上传到 Supabase
          const { error } = await supabase.from("agents").insert({
            name: props.name,
            system: props.system,
            description: props.description || props.system,
          });

          if (error) throw error;

          cmd.message("Successfully uploaded agent to market", "success");
          cmd.invoke("close_modal");
        } catch (error) {
          console.error("Upload agent failed:", error);
          cmd.message(
            `Upload agent failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error",
          );
        }
      },
    });
  }, [props]);

  if (!props) return null;

  return (
    <div key={props.id} className="flex-1 overflow-y-auto">
      {/* 顶部名称栏 */}
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-8 gap-4 overflow-hidden flex-col">
        <div className="flex items-center justify-between w-full gap-4">
          <Input
            type="text"
            defaultValue={props?.name || ""}
            onChange={(e) =>
              CurrentAgent.updateMeta({
                name: e.target.value,
              })
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
                Upload Agent
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
            value={[props.engine]}
            items={Object.entries(engines).map(([key, engine]) => ({
              label: engine.name,
              value: key,
              description: engine.description,
            }))}
            onSelect={([value]) =>
              CurrentAgent.updateMeta({
                engine: value,
              })
            }
          />
          <AutoResizeTextarea
            defaultValue={props.description || ""}
            key={props.id}
            onValueChange={(e) =>
              CurrentAgent.updateMeta({
                description: e.target.value,
              })
            }
            className="resize-none"
            placeholder="Please enter the description..."
          />
          {/* 模型部分 */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium">Model</h3>

            <DrawerSelector
              title="Text Model"
              value={props.models?.text ? [props.models.text] : []}
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
                CurrentAgent.updateMeta({
                  models: {
                    ...props.models,
                    text: value,
                  },
                })
              }
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted-foreground">
                  Temperature
                </label>
                <span className="text-sm tabular-nums">
                  {props.models?.text?.temperature?.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[props.models?.text?.temperature || 0]}
                min={0}
                max={2}
                step={0.1}
                className="px-1"
                onValueChange={(value) =>
                  CurrentAgent.updateMeta({
                    models: {
                      ...props.models,
                      text: {
                        provider: props.models?.text?.provider || "",
                        name: props.models?.text?.name || "",
                        temperature: value[0],
                      },
                    },
                  })
                }
              />
            </div>
          </section>

          {/* 系统提示词 */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">System Prompt</h3>
            <AutoResizeTextarea
              defaultValue={props.system}
              onValueChange={(e) =>
                CurrentAgent.updateMeta({
                  system: e.target.value,
                })
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
                value={props.tools || []}
                items={Object.values(plugins).flatMap((plugin: PluginProps) =>
                  plugin.tools.map((tool: ToolProps) => ({
                    label: tool.name,
                    value: tool.name + TOOL_NAME_SPLIT + plugin.id,
                    type: plugin.name,
                    description: tool.description,
                  })),
                )}
                onSelect={(value) =>
                  CurrentAgent.updateMeta({
                    tools: value,
                  })
                }
                multiple
                placeholder="Select Plugin..."
              />

              <DrawerSelector
                title="Select Workflow"
                value={props.workflows || []}
                items={Object.values(workflows).map((workflow) => ({
                  label: workflow.name,
                  value: workflow.id,
                  description: workflow.description,
                }))}
                onSelect={(value) =>
                  CurrentAgent.updateMeta({
                    workflows: value,
                  })
                }
                multiple
                placeholder="Select Workflow..."
              />

              <DrawerSelector
                title="Select Knowledge"
                value={props.knowledges || []}
                items={Object.values(list).map((k: KnowledgeMeta) => ({
                  label: k.name + "(" + k.version + ")",
                  value: k.id,
                }))}
                onSelect={(value) =>
                  CurrentAgent.updateMeta({
                    knowledges: value,
                  })
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
