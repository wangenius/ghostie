import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cmd } from "@/utils/shell";
import { memo, useCallback } from "react";
import { TbDots, TbFileText, TbShape3, TbUpload } from "react-icons/tb";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import { CurrentWorkflow, WorkflowsStore } from "../../workflow/Workflow";

export const WorkflowInfo = memo(() => {
  const workflow = CurrentWorkflow.use();
  const meta = WorkflowsStore.use((selector) => selector[workflow.meta.id]);

  // 处理名称变更
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      workflow.updateMeta({ name: e.target.value });
    },
    [workflow],
  );

  const handleUpload = async () => {
    dialog.confirm({
      title: "Upload Workflow",
      content: "Are you sure to upload this workflow?",
      onOk: async () => {
        try {
          await workflow.uploadToMarket();
          toast.success("Successfully uploaded workflow to market");
        } catch (error) {
          toast.error(`Upload workflow failed:${error}`);
        }
      },
    });
  };

  return (
    <div key={meta.id} className="flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 pl-3 flex-1">
          <TbShape3 className="w-6 h-6 text-muted-foreground" />
          <Input
            defaultValue={meta.name}
            variant="title"
            className="p-0 m-0 rounded-none text-primary/80 font-medium text-lg"
            onChange={handleNameChange}
            placeholder="Unnamed Workflow"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              cmd.invoke("open_url", {
                url: "https://ghostie.wangenius.com/tutorials/workflow",
              });
            }}
            variant="ghost"
          >
            <TbFileText className="w-4 h-4" />
            Documentation
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <TbDots className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleUpload}>
                <TbUpload className="w-4 h-4" />
                Upload to Market
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});
