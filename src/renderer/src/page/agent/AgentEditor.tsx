import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { useModels } from "@/hooks/useModels";
import { useState } from "react";

export const AgentEditor = () => {

  const [agent, setAgent] = useState<any>({
    id: "",
    name: "",
    description: "",
    version: "0.0.1",
    engine: "ReAct",
  });

  const { models } = useModels();

  return (
    <div key={agent.infos.id} className="flex-1 overflow-y-auto">
      {/* 主内容区 */}
      <div className="px-8 py-8">
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Agent Info</h3>

          <div className="flex gap-2">
            <Input
              type="text"
              defaultValue={agent.infos.name}
              onChange={(e) =>
                agent.update({
                  name: e.target.value,
                })
              }
              placeholder="Assistant Name"
            />{" "}
            <Input
              type="text"
              defaultValue={agent.infos.version || "0.0.1"}
              onChange={(e) =>
                agent.update({
                  version: e.target.value,
                })
              }
              placeholder="Assistant Version"
            />
          </div>

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
          <section className="space-y-4">
            <h3 className="text-lg font-medium">More Models</h3>
            <div className="space-y-4">
              <DrawerSelector
                title="Vision Model"
                value={[agent.infos.models?.vision]}
                items={models.flatMap(
                  (provider: any) => {
                    const key = provider.getApiKey(provider.name);
                    if (!key) return [];
                    const models = provider.models;
                    return Object.values(models).map((model: any) => {
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
                items={models.flatMap(
                  (provider: any) => {
                    const key = provider.getApiKey(provider.name);
                    if (!key) return [];
                    const models = provider.models;
                    return Object.values(models).map((model: any) => {
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
