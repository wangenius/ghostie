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
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbPlus, TbShape3 } from "react-icons/tb";
import { WorkflowsMarket } from "./components/WorkflowsMarket";
import { ContextWorkflow, Workflow } from "./execute/Workflow";
import { WorkflowEditor } from "./WorkflowEditor";

/* 工作流列表 */
export default function WorkflowsTab() {
  /* 工作流列表 */
  const workflows = Workflow.list.use();
  const contextWorkflowId = ContextWorkflow.use((selector) => selector.meta.id);
  const handleWorkflowSelect = (id: string) => {
    ContextWorkflow.switch(id);
  };

  const handleCreateWorkflow = async () => {
    await Workflow.create();
  };

  const handleOpenMarket = () => {
    dialog({
      title: "Workflows Market",
      content: <WorkflowsMarket />,
      className: "max-w-3xl",
    });
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
        left={
          <Button
            onClick={handleOpenMarket}
            className="bg-muted-foreground/10 hover:bg-muted-foreground/20"
          >
            <PiStorefrontDuotone className="w-4 h-4" />
            Workflows Market
          </Button>
        }
        right={
          <>
            <Button className="flex-1" onClick={handleCreateWorkflow}>
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
                <DropdownMenuItem onClick={() => {}}>
                  <TbDownload className="w-4 h-4" />
                  <span>Export Workflow</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="Support workflows: Create and manage automated workflows through visual orchestration. Supports multiple node types and conditional branches."
        items={Object.entries(workflows).map(([id, workflow]) => ({
          id,
          title: workflow.name || "Unnamed Workflow",
          description: workflow.description || "No description",
          onClick: () => handleWorkflowSelect(id),
          actived: contextWorkflowId === id,
          onRemove: () => {
            Workflow.delete(id);
            if (contextWorkflowId === id) {
              ContextWorkflow.close();
            }
          },
        }))}
      />

      {/* 右侧编辑器区域 */}
      <PreferenceBody
        emptyText="Please select a workflow or click the new button to create a workflow"
        EmptyIcon={TbShape3}
        isEmpty={!contextWorkflowId}
      >
        <WorkflowEditor />
      </PreferenceBody>
    </PreferenceLayout>
  );
}
