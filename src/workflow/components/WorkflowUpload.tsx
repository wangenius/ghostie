import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/utils/supabase";
import { cmd } from "@/utils/shell";
import { useState } from "react";
import { TbLoader2, TbUpload } from "react-icons/tb";
import { Workflow } from "../execute/Workflow";

export function WorkflowUpload({ close }: { close: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  );
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");

  const workflows = Workflow.list.use();

  // 上传工作流
  const handleUpload = async () => {
    if (!selectedWorkflowId || !author || !description) return;

    try {
      setIsUploading(true);
      const workflow = workflows[selectedWorkflowId];

      // 获取完整的工作流数据
      const workflowInstance = await Workflow.get(selectedWorkflowId);
      const workflowData = await workflowInstance.current();

      // 上传到 Supabase
      const { error } = await supabase.from("workflows").insert({
        name: workflow.name,
        description: description,
        data: workflowData,
        author: author,
      });

      if (error) throw error;

      cmd.message("成功上传工作流到市场", "success");
      close();
    } catch (error) {
      console.error("上传工作流失败:", error);
      cmd.message(
        `上传工作流失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 p-3">
        <div>
          <Select
            value={selectedWorkflowId || ""}
            onValueChange={setSelectedWorkflowId}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择工作流..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(workflows).map(([id, workflow]) => (
                <SelectItem key={id} value={id}>
                  {workflow.name || "未命名工作流"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="输入您的名字"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="输入工作流描述"
        />
        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            className="px-4 py-2 h-10"
            onClick={handleUpload}
            disabled={
              isUploading || !selectedWorkflowId || !author || !description
            }
          >
            {isUploading ? (
              <>
                <TbLoader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <TbUpload className="mr-2 h-4 w-4" />
                提交
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
