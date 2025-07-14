import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import {
  DrawerSelector,
  DrawerSelectorItem,
} from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { useModels, ModelType } from "@/hooks/useModels";
import { useAgent } from "@/hooks/useAgent";
import { useState, useEffect, useMemo } from "react";

// 从useAgent hook导入的类型
type AgentInfos = NonNullable<ReturnType<typeof useAgent>["agents"][string]>;

interface AgentEditorProps {
  agent: AgentInfos;
}

export const AgentEditor = ({ agent }: AgentEditorProps) => {
  const [localAgent, setLocalAgent] = useState<AgentInfos>(agent);
  const { updateAgent } = useAgent();
  const { fetchProviders, providers } = useModels();

  // 当传入的agent变化时，更新本地状态
  useEffect(() => {
    setLocalAgent(agent);
  }, [agent]);

  // 获取文本、视觉和图像模型
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // 将提供商配置转换为 DrawerSelectorItem 格式
  const getModelsArray = useMemo(() => {
    return (type: ModelType): DrawerSelectorItem[] => {
      const items: DrawerSelectorItem[] = [];

      providers.forEach((provider) => {
        // 为每个提供商添加其自定义模型
        if (provider.customModels && provider.customModels.length > 0) {
          provider.customModels.forEach((modelName) => {
            items.push({
              label: `${provider.displayName} - ${modelName}`,
              value: `${provider.name}:${modelName}`,
              description: `${provider.displayName} (${provider.format})`,
              type: type,
            });
          });
        } else {
          // 如果没有自定义模型，添加一个默认项
          items.push({
            label: provider.displayName,
            value: `${provider.name}:default`,
            description: `${provider.displayName} (${provider.format})`,
            type: type,
          });
        }
      });

      return items;
    };
  }, [providers]);

  // 更新agent的辅助函数
  const handleUpdate = async (updates: Partial<Omit<AgentInfos, "id">>) => {
    const updatedAgent = { ...localAgent, ...updates };
    setLocalAgent(updatedAgent);

    try {
      await updateAgent(agent.id, updates);
    } catch (error) {
      console.error("更新Agent失败:", error);
      // 如果更新失败，回滚本地状态
      setLocalAgent(agent);
    }
  };

  return (
    <div key={agent.id} className="flex-1 overflow-y-auto">
      {/* 主内容区 */}
      <div className="px-8 py-8">
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Agent Info</h3>

          <div className="flex gap-2">
            <Input
              type="text"
              value={localAgent.name}
              onChange={(e) =>
                handleUpdate({
                  name: e.target.value,
                })
              }
              placeholder="Assistant Name"
            />
            <Input
              type="text"
              value={localAgent.version || "0.0.1"}
              onChange={(e) =>
                handleUpdate({
                  version: e.target.value,
                })
              }
              placeholder="Assistant Version"
            />
          </div>

          <AutoResizeTextarea
            value={localAgent.description || ""}
            key={agent.id}
            onValueChange={(e) =>
              handleUpdate({
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
              value={localAgent.system}
              onValueChange={(e) =>
                handleUpdate({
                  system: e.target.value,
                })
              }
              className="resize-none outline-none"
              placeholder="Please enter the system prompt..."
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">Models</h3>
            <div className="space-y-4">
              <DrawerSelector
                title="Text Model"
                value={
                  localAgent.models?.chat
                    ? [
                        `${localAgent.models.chat.provider}:${localAgent.models.chat.name}`,
                      ]
                    : []
                }
                items={getModelsArray(ModelType.CHAT)}
                onSelect={([value]) => {
                  // 解析 value 格式: "provider:modelName" 为 ModelItem 格式
                  const [provider, name] = value.split(":");
                  handleUpdate({
                    models: {
                      ...localAgent.models,
                      chat: {
                        provider: provider,
                        name: name || "default",
                      },
                    },
                  });
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
