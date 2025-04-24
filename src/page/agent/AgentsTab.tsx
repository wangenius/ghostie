import { Agent } from "@/agent/Agent";
import { dialog } from "@/components/custom/DialogModal";
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
import { Echo } from "@/lib/echo/core/Echo";
import { AgentStore } from "@/store/agents";
import { cmd } from "@utils/shell";
import Avatar from "boring-avatars";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbGhost3, TbPlus, TbUpload } from "react-icons/tb";
import { AgentChat } from "./AgentChat";
import { AgentsMarket } from "./AgentsMarket";
import { ContextRuntimeProps } from "@/agent/context/Runtime";
import { CONTEXT_RUNTIME_DATABASE } from "@/assets/const";

export const ActiveAgents = new Echo<Record<string, Agent>>({});
export const CurrentAgent = new Echo<string>("");
export const LoadingAgents = new Echo<Record<string, boolean>>({});
export const ContextRuntimesEchos = new Echo<
  Record<string, ContextRuntimeProps>
>({}).indexed({
  database: CONTEXT_RUNTIME_DATABASE,
  name: "",
});

/** AgentsTab */
export function AgentsTab() {
  const activeAgents = CurrentAgent.use();
  const agents = AgentStore.use();
  const activeAgent = ActiveAgents.use((selector) => selector[activeAgents]);

  /* 创建机器人 */
  const handleCreateAgent = async () => {
    try {
      await Agent.create();
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
        left={
          <Button
            onClick={() => {
              dialog({
                closeIconHide: true,
                content: <AgentsMarket />,
              });
            }}
            className="bg-muted-foreground/10 hover:bg-muted-foreground/20"
          >
            <PiStorefrontDuotone className="w-4 h-4" />
            数字员工市场
          </Button>
        }
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
              AgentStore.delete(agent.id);
              return null;
            }
            return {
              id: agent.id,
              title: (
                <span className="flex items-center space-x-3">
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
                    square={false}
                  />
                  <span>{agent.name || "未命名助手"}</span>
                </span>
              ),
              onClick: async () => {
                if (ActiveAgents.current[agent.id]) {
                  ActiveAgents.current[agent.id].createNewContext();
                } else {
                  ActiveAgents.current[agent.id] = new Agent(
                    (await AgentStore.getCurrent())[agent.id],
                  );
                }
                await ContextRuntimesEchos.temporary()
                  .indexed({
                    database: CONTEXT_RUNTIME_DATABASE,
                    name: agent.id || "",
                  })
                  .ready();

                CurrentAgent.set(agent.id);
              },
              actived: activeAgent?.props.id === agent.id,
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
        isEmpty={!activeAgent?.props.id}
      >
        {activeAgent && (
          <AgentChat
            key={`${activeAgent.props.id}-${Date.now()}`}
            agent={activeAgent}
            close={() => ActiveAgents.delete(activeAgent.props.id)}
          />
        )}
      </PreferenceBody>
    </PreferenceLayout>
  );
}
