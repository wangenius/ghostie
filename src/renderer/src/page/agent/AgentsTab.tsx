import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceSidebar } from "@/components/layout/PreferenceSidebar";
import { Button } from "@/components/ui/button";
import { Tools } from "@/utils/tools";
import Avatar from "boring-avatars";
import { TbGhost3, TbPlus } from "react-icons/tb";
import { AgentChat } from "./AgentChat";
import { useState } from "react";

/** AgentsTab */
export function AgentsTab() {
  const [activeAgent, setActiveAgent] = useState<any>(null);

  /* 创建机器人 */
  const handleCreateAgent = async () => {
    try {
      const agent = {
        id: "1",
        name: "Agent 1",
        description: "Agent 1 description",
        version: "0.0.1",
        engine: "ReAct",
      };
      setActiveAgent(agent);
    } catch (error) {
      console.error("add agent error:", error);
    }
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceSidebar
        right={
          <>
            <Button className="flex-1" onClick={handleCreateAgent}>
              <TbPlus className="w-4 h-4" />
              New
            </Button>
          </>
        }
        items={[{
          id: "1",
          name: "Agent 1",
          description: "Agent 1 description",
          version: "0.0.1",
          engine: "ReAct",
        }].map((agent) => {
            if (!agent.id) {
              return null;
            }
            return {
              id: agent.id,
              content: <TabItem agent={agent} />,
              onClick: async () => {
                setActiveAgent(agent);
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
        {activeAgent && <AgentChat />}
      </PreferenceBody>
    </PreferenceLayout>
  );
}

const TabItem = ({ agent }: { agent: any }) => {
  const loadingState = false;
  const message = {
    role: "user",
    content: "Hello, how are you?",
    created_at: new Date().toISOString(),
    id: "1",
  }
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
          {loadingState[agent.id] ? "typing..." : message?.content || ""}
        </span>
      </div>
    </div>
  );
};
