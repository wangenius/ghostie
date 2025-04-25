import { WORKFLOW_BODY_DATABASE } from "@/assets/const";
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
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPlus, TbShape3 } from "react-icons/tb";
import {
  CurrentWorkflow,
  Workflow,
  WorkflowsStore,
} from "../../workflow/Workflow";
import { WorkflowEditor } from "./WorkflowEditor";
import { CurrentEditWorkflow } from "./context/FlowContext";

/* 工作流列表 */
export default function WorkflowsTab() {
  /* 工作流列表 */
  const workflows = WorkflowsStore.use();
  /* 当前工作流 */
  const contextWorkflowId = CurrentWorkflow.use((selector) => selector.meta.id);

  const handleWorkflowSelect = async (id: string) => {
    CurrentWorkflow.set(await Workflow.get(id), { replace: true });
    await CurrentEditWorkflow.indexed({
      database: WORKFLOW_BODY_DATABASE,
      name: id,
    }).ready();
  };

  const handleCreateWorkflow = async () => {
    await Workflow.create();
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
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
          onClick: async () => await handleWorkflowSelect(id),
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
