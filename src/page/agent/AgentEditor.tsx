import { Agent, AgentStore } from "@/agent/Agent";
import { EngineManager } from "@/agent/engine/EngineManager";
import { dialog } from "@/components/custom/DialogModal";
import { Prose } from "@/components/editor/Prose";
import { SimpleSlate } from "@/components/editor/SimpleSlate";
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
import { KnowledgesStore, KnowledgeMeta } from "@/knowledge/Knowledge";
import { ChatModelManager } from "@/model/chat/ChatModelManager";
import { ImageModelManager } from "@/model/image/ImageModelManager";
import { VisionModelManager } from "@/model/vision/VisionModelManager";
import { PluginStore } from "@/plugin/ToolPlugin";
import { PluginProps, ToolProps } from "@/plugin/types";
import { supabase } from "@/utils/supabase";
import { WorkflowsStore } from "@/workflow/Workflow";
import { useCallback, useEffect } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbUpload } from "react-icons/tb";
import { toast } from "sonner";

export const AgentEditor = ({ agent }: { agent: Agent }) => {
  const list = KnowledgesStore.use();
  const workflows = WorkflowsStore.use();
  const props = AgentStore.use((selector) => selector[agent.props.id]);
  const plugins = PluginStore.use();
  const engines = EngineManager.getEngines();

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
          toast.success("Successfully uploaded agent to market");
        } catch (error) {
          toast.error(`Upload agent failed: ${error}`);
        }
      },
    });
  }, [props]);

  if (!props) return null;

  return (
    <div key={props.id} className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-8 gap-4 overflow-hidden flex-col">
        <div className="flex items-center justify-between w-full gap-4">
          <Input
            type="text"
            defaultValue={props?.name}
            onChange={(e) =>
              agent.update({
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
              agent.update({
                engine: value,
              })
            }
          />
          <AutoResizeTextarea
            defaultValue={props.description}
            key={props.id}
            onValueChange={(e) =>
              agent.update({
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
              value={[props.models?.text]}
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
                agent.update({
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
                  {props.configs?.temperature?.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[props.configs?.temperature || 0]}
                min={0}
                max={2}
                step={0.1}
                className="px-1"
                onValueChange={(value) => {
                  agent.update({
                    configs: {
                      ...props.configs,
                      temperature: value[0],
                    },
                  });
                }}
              />
            </div>
          </section>

          {/* 系统提示词 */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">System Prompt</h3>
            <div className="bg-muted-foreground/5 rounded-2xl p-4">
              <SimpleSlate
                defaultValue={Prose.sharpen(props.system.trim() || "")}
                onChange={(e) =>
                  agent.update({
                    system: Prose.flatten(e).trim(),
                  })
                }
                className="resize-none outline-none"
                placeholder="Please enter the system prompt..."
              />
            </div>
          </section>

          {/* 功能扩展 */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium">Function Extensions</h3>
            <div className="space-y-4">
              <DrawerSelector
                title="Select Plugin"
                value={props.tools}
                items={Object.values(plugins).flatMap((plugin: PluginProps) =>
                  plugin.tools.map((tool: ToolProps) => ({
                    label: tool.name,
                    value: {
                      plugin: plugin.id,
                      tool: tool.name,
                    },
                    type: plugin.name,
                    description: tool.description,
                  })),
                )}
                onSelect={(value) =>
                  agent.update({
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
                  agent.update({
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
                  description: k.description,
                }))}
                onSelect={(value) =>
                  agent.update({
                    knowledges: value,
                  })
                }
                multiple
                placeholder="Select Knowledge..."
              />
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="text-lg font-medium">More Models</h3>
            <div className="space-y-4">
              <DrawerSelector
                title="Vision Model"
                value={[props.models?.vision]}
                items={Object.values(VisionModelManager.getProviders()).flatMap(
                  (provider) => {
                    const key = VisionModelManager.getApiKey(provider.name);
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
                  agent.update({
                    models: {
                      ...props.models,
                      vision: value,
                    },
                  })
                }
              />
              <DrawerSelector
                title="Image Model"
                value={[props.models?.image]}
                items={Object.values(ImageModelManager.getProviders()).flatMap(
                  (provider) => {
                    const key = ImageModelManager.getApiKey(provider.name);
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
                  agent.update({
                    models: {
                      ...props.models,
                      image: value,
                    },
                  })
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
