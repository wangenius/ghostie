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
import { getColor } from "@/utils/color";
import { gen } from "@/utils/generator";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbGhost3, TbPlus, TbUpload } from "react-icons/tb";
import { AgentEditor } from "./AgentEditor";
import { AgentsMarket } from "./AgentsMarket";

export const CurrentAgent = new Agent();
/** 机器人列表 */
export function AgentsTab() {
  const agents = Agent.list.use();
  const props = CurrentAgent.use();

  const handleCreateAgent = async () => {
    try {
      const id = gen.id();
      await Agent.create({ id });
      CurrentAgent.indexed(id);
    } catch (error) {
      console.error("add agent error:", error);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the assistant "${agents[id].name}"?`,
    );
    if (answer) {
      try {
        Agent.delete(id);
        if (props?.id === id) {
          CurrentAgent.close();
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
        items={Object.entries(agents).map(([id, agent]) => ({
          id,
          title: (
            <span className="flex items-center">
              <span>{agent.name || "Unnamed Agent"}</span>
              <small
                className="ml-2 text-[10px] text-muted bg-primary/80 px-2 rounded-xl"
                style={{
                  backgroundColor: getColor(agent.engine),
                }}
              >
                {agent.engine}
              </small>
            </span>
          ),
          description:
            agent.description?.slice(0, 50) ||
            agent.system?.slice(0, 50) ||
            "No prompt",
          onClick: () => {
            CurrentAgent.indexed(id);
          },
          actived: props?.id === id,
          onRemove: () => handleDeleteAgent(id),
        }))}
        emptyText="Please select an assistant or click the add button to create a new assistant"
        EmptyIcon={TbGhost3}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="Please select an assistant or click the add button to create a new assistant"
        EmptyIcon={TbGhost3}
        isEmpty={!props}
      >
        <AgentEditor />
      </PreferenceBody>
    </PreferenceLayout>
  );
}
