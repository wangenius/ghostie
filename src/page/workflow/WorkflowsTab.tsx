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
import {
  CurrentWorkflow,
  Workflow,
  WorkflowsStore,
} from "../../workflow/Workflow";
import { WorkflowsMarket } from "./WorkflowsMarket";
import { WorkflowEditor } from "./WorkflowEditor";
import { CurrentEditWorkflow } from "./context/FlowContext";
import { WORKFLOW_BODY_DATABASE } from "@/workflow/const";

/* 工作流列表 */
export default function WorkflowsTab() {
  /* 工作流列表 */
  const workflows = WorkflowsStore.use();
  const contextWorkflowId = CurrentWorkflow.use((selector) => selector.meta.id);
  const handleWorkflowSelect = (id: string) => {
    CurrentWorkflow.set(Workflow.get(id), { replace: true });
    CurrentEditWorkflow.indexed({
      database: WORKFLOW_BODY_DATABASE,
      name: id,
    });
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
            dialog.confirm({
              title: "Delete Workflow",
              content: "Are you sure you want to delete this workflow?",
              onOk: () => {
                Workflow.delete(id);
                if (contextWorkflowId === id) {
                  CurrentWorkflow.set(new Workflow());
                }
              },
            });
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
