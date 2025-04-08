import { CronInput } from "@/components/custom/CronInput";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Scheduler } from "@/workflow/Scheduler";
import { Workflow, WorkflowsStore } from "@/workflow/Workflow";
import { useCallback, useState } from "react";
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
  const scheduler = Scheduler.use();

  const [cron, setCron] = useState<string>("");
  // 处理描述变更
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      workflow.updateMeta({ description: e.target.value });
    },
    [workflow],
  );

  // 处理定时启用状态变更
  const handleScheduleEnabledChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        // 使用当前的 frequency 配置更新定时任务
        Scheduler.add(meta.id, cron);
      } else {
        Scheduler.cancel(meta.id);
      }
    },
    [meta.id, scheduler],
  );

  // 处理 cron 表达式变更
  const handleCronExpressionChange = useCallback(
    (newExpression: string) => {
      setCron(newExpression);
      Scheduler.update(meta.id, newExpression);
    },
    [meta.id],
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
                <div className="space-y-4 pt-4">
                  <Label>Schedule</Label>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Cron Expression</label>
                    <Switch
                      checked={meta.id in scheduler}
                      onCheckedChange={handleScheduleEnabledChange}
                    />
                  </div>
                  {meta.id in scheduler && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <CronInput
                          value={cron}
                          onChange={handleCronExpressionChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
