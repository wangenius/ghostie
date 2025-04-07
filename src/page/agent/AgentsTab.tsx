import { Agent, AgentStore } from "@/agent/Agent";
import { AgentProps } from "@/agent/types/agent";
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
import { cmd } from "@utils/shell";
import { Echo } from "echo-state";
import { useEffect, useState } from "react";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbGhost3, TbPlus, TbUpload } from "react-icons/tb";
import { AgentEditor } from "./AgentEditor";
import { AgentsMarket } from "./AgentsMarket";

export const CurrentSelectedAgent = new Echo<string>("");

/** AgentsTab */
export function AgentsTab() {
  const selectedId = CurrentSelectedAgent.use();
  const agents = AgentStore.use();
  const [agent, setAgent] = useState<Agent>(new Agent());

  useEffect(() => {
    if (selectedId) {
      Agent.get(selectedId).then((agent) => {
        setAgent(agent);
      });
    }
  }, [selectedId]);
  /* Current Agent */

  /* 创建机器人 */
  const handleCreateAgent = async () => {
    try {
      await Agent.create();
    } catch (error) {
      console.error("add agent error:", error);
    }
  };

  const handleDeleteAgent = async (agent: AgentProps) => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the assistant "${agent.name}"?`,
    );
    if (answer) {
      try {
        Agent.delete(agent.id);
        if (selectedId === agent.id) {
          CurrentSelectedAgent.reset();
        }
      } catch (error) {
        console.error("delete agent error:", error);
      }
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
                title: "Agents Market",
                content: <AgentsMarket />,
                className: "max-w-3xl",
              });
            }}
            className="bg-muted-foreground/10 hover:bg-muted-foreground/20"
          >
            <PiStorefrontDuotone className="w-4 h-4" />
            Agents Market
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
              Agent.delete(agent.id);
              return null;
            }
            return {
              id: agent.id,
              title: (
                <span className="flex items-center">
                  <span>{agent.name || "Unnamed Agent"}</span>
                  <small className="ml-2 text-[12px] text-muted bg-primary/80 px-2 rounded-xl">
                    {agent.engine}
                  </small>
                  <small className="ml-2 text-[12px] text-muted-foreground bg-muted-foreground/20 px-2 rounded-xl">
                    {agent.models?.text?.provider}
                  </small>
                </span>
              ),
              description:
                agent.description?.slice(0, 50) ||
                agent.system?.slice(0, 50) ||
                "No prompt",
              onClick: () => {
                CurrentSelectedAgent.set(agent.id);
              },
              actived: selectedId === agent.id,
              onRemove: () => handleDeleteAgent(agent),
            };
          })
          .filter((item) => item !== null)}
        emptyText="Please select an assistant or click the add button to create a new assistant"
        EmptyIcon={TbGhost3}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="Please select an assistant or click the add button to create a new assistant"
        EmptyIcon={TbGhost3}
        isEmpty={!selectedId}
      >
        <AgentEditor agent={agent} />
      </PreferenceBody>
    </PreferenceLayout>
  );
}
