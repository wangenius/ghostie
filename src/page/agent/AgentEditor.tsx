import { Agent } from "@/agent/Agent";
import { EngineManager } from "@/agent/engine/EngineManager";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { KnowledgeMeta } from "@/knowledge/Knowledge";
import { ChatModelManager } from "@/model/chat/ChatModelManager";
import { ImageModelManager } from "@/model/image/ImageModelManager";
import { VisionModelManager } from "@/model/vision/VisionModelManager";
import { PluginStore } from "@/plugin/ToolPlugin";
import { PluginProps, ToolProps } from "@/plugin/types";
import { SkillManager } from "@/skills/SkillManager";
import { WorkflowsStore } from "@/workflow/Workflow";
import { TbListSearch } from "react-icons/tb";
import { MCPTool, MCP_Actived } from "../mcp/MCP";
import { SettingItem } from "../settings/components/SettingItem";
import { AgentStore } from "@/store/agents";
import { KnowledgesStore } from "@/store/knowledges";

export const AgentEditor = ({ agent }: { agent: Agent }) => {
  const list = KnowledgesStore.use();
  const workflows = WorkflowsStore.use();
  const props = AgentStore.use((selector) => selector[agent.props.id]);
  const plugins = PluginStore.use();
  const engines = EngineManager.getEngines();
  const actived_mcps = MCP_Actived.use();
  const agents = AgentStore.use();

  if (!props) return null;

  return (
    <div key={props.id} className="flex-1 overflow-y-auto">
      {/* 主内容区 */}
      <div className="px-8 py-8">
        <div className="space-y-6">
          <Input
            type="text"
            defaultValue={props?.name}
            onChange={(e) =>
              agent.update({
                name: e.target.value,
              })
            }
            placeholder="Assistant Name"
          />
          <DrawerSelector
            title="Agent Mode"
            value={[props.engine]}
            items={Object.entries(engines).map(([key, engine]) => ({
              label: engine.name,
              value: key,
              description: engine.description,
              variant: engine.name !== "ReAct" ? "danger" : "default",
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
            placeholder="Enter the description, this will be work as a description for other agent call this agent"
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
            <AutoResizeTextarea
              defaultValue={props.system}
              onValueChange={(e) =>
                agent.update({
                  system: e.target.value,
                })
              }
              className="resize-none outline-none"
              placeholder="Please enter the system prompt..."
            />
          </section>

          {/* 功能扩展 */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium">Abilities</h3>
            <div className="space-y-4 px-2">
              <SettingItem
                icon={<TbListSearch className="w-[18px] h-[18px]" />}
                title="auto search all abilities"
                description={`Current abilities: ${false}`}
                action={
                  <div className="flex gap-1">
                    <Switch
                      checked={false}
                      disabled={true}
                      title="this will be implemented in the next version"
                      onCheckedChange={() => {}}
                    />
                  </div>
                }
              />
              <DrawerSelector
                title="Select Sub-Agents"
                value={props.agents}
                items={Object.values(agents)
                  .map((agent) => {
                    if (agent.id === props.id) return null;
                    return {
                      label: agent.name,
                      value: agent.id,
                      description: agent.description,
                    };
                  })
                  .filter((item) => item !== null)}
                onSelect={(value) =>
                  agent.update({
                    agents: value,
                  })
                }
                multiple
                placeholder="Select Sub-Agents..."
              />
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
                title="Select MCP"
                value={props.mcps}
                items={Object.entries(actived_mcps)
                  .flatMap(([id, tools]) =>
                    tools?.map((tool: MCPTool) => ({
                      label: tool.name,
                      value: {
                        server: id,
                        tool: tool.name,
                      },
                      type: id,
                      description: tool.description,
                    })),
                  )
                  .filter((item) => item !== null)}
                onSelect={(value) =>
                  agent.update({
                    mcps: value,
                  })
                }
                multiple
                placeholder="Select MCP..."
              />
              <DrawerSelector
                title="Select Skill"
                value={props.skills}
                items={Object.entries(SkillManager.getSkills()).map(
                  ([id, skill]) => ({
                    label: skill.name,
                    value: id,
                    description: skill.description,
                  }),
                )}
                onSelect={(value) =>
                  agent.update({
                    skills: value,
                  })
                }
                multiple
                placeholder="Select Skill..."
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
