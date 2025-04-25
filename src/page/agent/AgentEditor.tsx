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
import { KnowledgesStore } from "@/store/knowledges";
import { WorkflowsStore } from "@/workflow/Workflow";
import { TbListSearch } from "react-icons/tb";
import { MCPTool, MCP_Actived } from "../mcp/MCP";
import { SettingItem } from "../settings/components/SettingItem";
import { AgentManager } from "@/store/AgentManager";
export const AgentEditor = () => {
  const list = KnowledgesStore.use();
  const workflows = WorkflowsStore.use();
  const id = AgentManager.currentOpenedAgent.use();
  const agent = AgentManager.OPENED_AGENTS.get(id);
  const plugins = PluginStore.use();
  const engines = EngineManager.getEngines();
  const actived_mcps = MCP_Actived.use();
  const agents = AgentManager.list.use();

  if (!agent) return null;

  return (
    <div key={agent.infos.id} className="flex-1 overflow-y-auto">
      {/* 主内容区 */}
      <div className="px-8 py-8">
        <div className="space-y-6">
          <Input
            type="text"
            defaultValue={agent.infos.name}
            onChange={(e) =>
              agent.update({
                name: e.target.value,
              })
            }
            placeholder="Assistant Name"
          />
          <DrawerSelector
            title="Agent Mode"
            value={[agent.infos.engine]}
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
            defaultValue={agent.infos.description}
            key={agent.infos.id}
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
              value={[agent.infos.models?.text]}
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
                    ...agent.infos.models,
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
                  {agent.infos.configs?.temperature?.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[agent.infos.configs?.temperature || 0]}
                min={0}
                max={2}
                step={0.1}
                className="px-1"
                onValueChange={(value) => {
                  agent.update({
                    configs: {
                      ...agent.infos.configs,
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
              defaultValue={agent.infos.system}
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
                value={agent.infos.agents}
                items={Object.values(agents)
                  .map((item) => {
                    if (item.id === agent.infos.id) return null;
                    return {
                      label: item.name,
                      value: item.id,
                      description: item.description,
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
                value={agent.infos.tools}
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
                value={agent.infos.workflows || []}
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
                value={agent.infos.mcps}
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
                value={agent.infos.skills}
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
                value={agent.infos.knowledges || []}
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
                value={[agent.infos.models?.vision]}
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
                      ...agent.infos.models,
                      vision: value,
                    },
                  })
                }
              />
              <DrawerSelector
                title="Image Model"
                value={[agent.infos.models?.image]}
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
                      ...agent.infos.models,
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
