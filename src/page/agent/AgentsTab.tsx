import { Agent } from "@/agent/Agent";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentManager } from "@/store/AgentManager";
import { cmd } from "@utils/shell";
import Avatar from "boring-avatars";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbGhost3, TbPlus, TbUpload } from "react-icons/tb";
import { AgentChat } from "./AgentChat";

/** AgentsTab */
export function AgentsTab() {
  const activeAgents = AgentManager.currentOpenedAgent.use();
  const agents = AgentManager.list.use();
  const loadingState = AgentManager.loadingState.use();
  const activeAgent = AgentManager.OPENED_AGENTS.get(activeAgents);

  console.log(activeAgents);

  /* 创建机器人 */
  const handleCreateAgent = async () => {
    try {
      const agent = await Agent.create();
      AgentManager.list.set({ [agent.infos.id]: agent.infos });
    } catch (error) {
      console.error("add agent error:", error);
    }
  };

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "Select Assistant Configuration File",
          filters: {
            "Assistant Configuration": ["json"],
          },
        },
      );
      if (result) {
        cmd.message("function is not implemented", "import success");
      }
    } catch (error) {
      console.error("import agent error:", error);
      await cmd.message(`import agent error: ${error}`, "import failed");
    }
  };

  const handleExport = async () => {
    try {
      const result = await cmd.invoke<boolean>("save_file", {
        title: "Save Assistant Configuration",
        filters: {
          "Assistant Configuration": ["json"],
        },
        defaultName: "agents.json",
        content: JSON.stringify(agents),
      });

      if (result) {
        await cmd.message(
          "Successfully exported assistant configuration",
          "export success",
        );
      }
    } catch (error) {
      console.error("export agent error:", error);
      await cmd.message(`export agent error: ${error}`, "export failed");
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImport}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>Import</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>Export</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        items={Object.values(agents)
          .map((agent) => {
            if (!agent.id) {
              AgentManager.list.delete(agent.id);
              return null;
            }
            return {
              id: agent.id,
              content: (
                <div className="flex items-center space-x-3">
                  <Avatar
                    size={32}
                    name={agent.id}
                    variant="beam"
                    colors={[
                      "#92A1C6",
                      "#146A7C",
                      "#F0AB3D",
                      "#C271B4",
                      "#C20D90",
                    ]}
                    className="flex-none"
                    square={false}
                  />

                  <div className="flex flex-col items-start space-y-1 font-normal text-xs overflow-hidden">
                    <span className="text-sm font-medium">
                      {agent.name || "未命名助手"}
                    </span>
                    {loadingState[agent.id] ? (
                      <span className="text-xs text-muted-foreground">
                        typing...
                      </span>
                    ) : (
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {AgentManager.OPENED_AGENTS.get(
                          agent.id,
                        )?.context.runtime.getLastMessage()?.content ||
                          agent.description}
                      </span>
                    )}
                  </div>
                </div>
              ),

              onClick: async () => {
                if (!AgentManager.OPENED_AGENTS.get(agent.id)) {
                  const newAgent = await AgentManager.getFromLocal(agent.id);
                  AgentManager.OPENED_AGENTS.set(agent.id, newAgent);
                }
                AgentManager.currentOpenedAgent.set(agent.id);
              },
              actived: activeAgent?.infos.id === agent.id,
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
