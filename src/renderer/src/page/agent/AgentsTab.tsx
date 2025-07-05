import { Agent } from "@/agent/Agent";
import { AgentInfos, DEFAULT_AGENT } from "@/agent/types/agent";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { AgentManager } from "@/store/AgentManager";
import { Tools } from "@/utils/tools";
import Avatar from "boring-avatars";
import { TbGhost3, TbPlus } from "react-icons/tb";
import { AgentChat } from "./AgentChat";

/** AgentsTab */
export function AgentsTab() {
  const activeAgents = AgentManager.currentOpenedAgent.use();
  const agents = AgentManager.OPENED_AGENTS.use();
  const activeAgent = agents[activeAgents];
  const agentsList = AgentManager.list.use();

  /* 创建机器人 */
  const handleCreateAgent = async () => {
    try {
      const agent = await Agent.create();
      AgentManager.list.set({
        [agent.infos.id]: { ...DEFAULT_AGENT, id: agent.infos.id },
      });
    } catch (error) {
      console.error("add agent error:", error);
    }
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
        right={
          <>
            <Button className="flex-1" onClick={handleCreateAgent}>
              <TbPlus className="w-4 h-4" />
              New
            </Button>
          </>
        }
        items={Object.values(agentsList)
          .map((infos) => {
            if (!infos.id) {
              AgentManager.list.delete(infos.id);
              return null;
            }
            return {
              id: infos.id,
              content: <TabItem agent={infos} />,
              onClick: async () => {
                if (!AgentManager.OPENED_AGENTS.current[infos.id]) {
                  const newAgent = await AgentManager.getById(infos.id);
                  AgentManager.OPENED_AGENTS.set({
                    [infos.id]: newAgent,
                  });
                }
                AgentManager.currentOpenedAgent.set(infos.id);
              },
              actived: activeAgent?.infos.id === infos.id,
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
        isEmpty={!activeAgent?.infos.id}
      >
        {activeAgent && <AgentChat />}
      </PreferenceBody>
    </PreferenceLayout>
  );
}

const TabItem = ({ agent }: { agent: AgentInfos }) => {
  const instance = AgentManager.OPENED_AGENTS.current[agent.id];
  const loadingState = AgentManager.loadingState.use();
  const message = instance?.context.getLastMessage();
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
