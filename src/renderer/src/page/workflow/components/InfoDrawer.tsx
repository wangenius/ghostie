import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Workflow, WorkflowsStore } from "@/workflow/Workflow";
import { useCallback } from "react";
import "reactflow/dist/style.css";

export const InfoDrawer = ({
  isEditDrawerOpen,
  setIsEditDrawerOpen,
  workflow,
}: {
  isEditDrawerOpen: boolean;
  setIsEditDrawerOpen: (open: boolean) => void;
  workflow: Workflow;
}) => {
  const meta = WorkflowsStore.use((selector) => selector[workflow.meta.id]);
  // 处理描述变更
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      workflow.updateMeta({ description: e.target.value });
    },
    [workflow],
  );

  return (
    <Drawer
      direction="right"
      open={isEditDrawerOpen}
      onOpenChange={setIsEditDrawerOpen}
      className="w-[380px]"
      title="Workflow Trigger"
      key={`edit-${meta.id}`}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <div className="space-y-4">
                <Label>Trigger Description</Label>
                <div className="space-y-2">
                  <Textarea
                    defaultValue={meta.description}
                    onChange={handleDescriptionChange}
                    placeholder="Enter workflow description for llm trigger"
                    className="min-h-[100px] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
