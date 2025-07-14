import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceSidebar } from "@/components/layout/PreferenceSidebar";
import { Button } from "@/components/ui/button";
import { Tools } from "@common/tools";
import Avatar from "boring-avatars";
import { TbGhost3, TbPlus } from "react-icons/tb";
import { AgentChat } from "./AgentChat";
import { useState, useEffect, useCallback } from "react";
import { useAgent } from "@/hooks/useAgent";

// 从useAgent hook导入的类型
type AgentInfos = NonNullable<ReturnType<typeof useAgent>["agents"][string]>;

/** AgentsTab */
export function AgentsTab() {
  const [activeAgent, setActiveAgent] = useState<AgentInfos | null>(null);
  const { agents, loading, createAgent } = useAgent();

  // 持久化当前选中的Agent ID
  const [persistedAgentId, setPersistedAgentId] = useState<string | null>(() => {
    return localStorage.getItem('activeAgentId');
  });

  // 当agents更新时，同步更新activeAgent
  useEffect(() => {
    if (activeAgent && agents[activeAgent.id]) {
      setActiveAgent(agents[activeAgent.id]);
    }
  }, [agents, activeAgent?.id]);

  // 初始化时恢复上次选中的Agent
  useEffect(() => {
    if (persistedAgentId && agents[persistedAgentId] && !activeAgent) {
      setActiveAgent(agents[persistedAgentId]);
    } else if (!persistedAgentId && Object.keys(agents).length > 0 && !activeAgent) {
      // 如果没有持久化的Agent ID，选择第一个Agent
      const firstAgent = Object.values(agents)[0];
      if (firstAgent) {
        setActiveAgent(firstAgent);
        setPersistedAgentId(firstAgent.id);
        localStorage.setItem('activeAgentId', firstAgent.id);
      }
    }
  }, [agents, persistedAgentId, activeAgent]);

  // 更新持久化的Agent ID
  const handleSetActiveAgent = useCallback((agent: AgentInfos) => {
    setActiveAgent(agent);
    setPersistedAgentId(agent.id);
    localStorage.setItem('activeAgentId', agent.id);
  }, []);

  /* 创建机器人 */
  const handleCreateAgent = async () => {
    try {
      const newAgent = await createAgent({
        name: "新助手",
        description: "这是一个新创建的助手",
        system: "你是一个有用的AI助手",
        version: "0.0.1",
        engine: "react",
        models: {
          chat: {
            provider: "qwen",
            name: "qwen-turbo",
          },
        },
      });
      handleSetActiveAgent(newAgent);
    } catch (error) {
      console.error("创建助手失败:", error);
    }
  };

  // 将agents对象转换为数组
  const agentList = Object.values(agents);

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceSidebar
        right={
          <>
            <Button
              className="flex-1"
              onClick={handleCreateAgent}
              disabled={loading}
            >
              <TbPlus className="w-4 h-4" />
              New
            </Button>
          </>
        }
        items={agentList
          .map((agent) => {
            if (!agent.id) {
              return null;
            }
            return {
              id: agent.id,
              content: <TabItem agent={agent} />,
              onClick: async () => {
                handleSetActiveAgent(agent);
              },
              actived: activeAgent?.id === agent.id,
              noRemove: true,
            };
          })
          .filter((item) => item !== null)}
        emptyText="请选择一个助手或点击添加按钮创建新助手"
        EmptyIcon={TbGhost3}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="Please select an assistant or click the add button to create a new assistant"
        EmptyIcon={TbGhost3}
        isEmpty={!activeAgent?.id}
      >
        {activeAgent && <AgentChat agent={activeAgent} />}
      </PreferenceBody>
    </PreferenceLayout>
  );
}

const TabItem = ({ agent }: { agent: AgentInfos }) => {
  const loadingState = false;
  const message = {
    role: "user",
    content: "Hello, how are you?",
    created_at: new Date().toISOString(),
    id: "1",
  };
  return (
    <div className="flex items-center justify-between gap-2 min-h-8">
      <Avatar
        size={32}
        name={agent.id}
        variant="beam"
        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
        className="flex-none"
        square={false}
      />
      <div className="flex flex-col items-start justify-start flex-1 gap-1">
        <div className="flex justify-between w-full">
          <span className="font-bold text-sm truncate">
            {agent.name || "未命名助手"}{" "}
          </span>
          <span className="font-normal text-xs text-muted-foreground/50 truncate">
            {message?.created_at ? Tools.whenWasThat(message?.created_at) : ""}
          </span>
        </div>
        <span className="text-xs text-muted-foreground line-clamp-1">
          {loadingState
            ? "typing..."
            : message?.content || agent.description || ""}
        </span>
      </div>
    </div>
  );
};
