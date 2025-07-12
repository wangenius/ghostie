import { dialog } from "@/components/custom/DialogModal";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceSidebar } from "@/components/layout/PreferenceSidebar";
import { Button } from "@/components/ui/button";
import { TbPlus, TbShape3 } from "react-icons/tb";
import { WorkflowEditor } from "./WorkflowEditor";

/* 工作流列表 */
export default function WorkflowsTab() {
  /* 工作流列表 */
  const workflows = {};
  /* 当前工作流 */
  const contextWorkflowId = "";

  const handleWorkflowSelect = async (id: string) => {
    // CurrentWorkflow.set(await Workflow.get(id), { replace: true });
    // await CurrentEditWorkflow.indexed({
    //   database: WORKFLOW_BODY_DATABASE,
    //   name: id,
    // }).ready();
  };

  const handleCreateWorkflow = async () => {
    // await Workflow.create();
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceSidebar
        right={
          <>
            <Button className="flex-1" onClick={handleCreateWorkflow}>
              <TbPlus className="w-4 h-4" />
              New
            </Button>
          </>
        }
        items={Object.entries(workflows).map(([id, workflow]: any) => ({
          id,
          content: (
            <div className="flex flex-col items-start gap-1">
              <span className="font-bold text-sm truncate">
                {workflow.name || "Unnamed Workflow"}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {workflow.description || "No description"}
              </span>
            </div>
          ),
          onClick: async () => await handleWorkflowSelect(id),
          actived: contextWorkflowId === id,
          onRemove: () => {
            dialog.confirm({
              title: "Delete Workflow",
              content: "Are you sure you want to delete this workflow?",
              onOk: () => {
                // Workflow.delete(id);
                if (contextWorkflowId === id) {
                  // CurrentWorkflow.set(new Workflow());
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
