import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { NodeExecutor } from "../../../workflow/execute/NodeExecutor";
import { useFlow } from "../context/FlowContext";
import { FormatNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const FormatNodeComponent = (props: NodeProps<FormatNodeConfig>) => {
  const [content, setContent] = useState(props.data.content);
  const { updateNodeData } = useFlow();
  const [open, setOpen] = useState(false);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setContent(newValue);
      updateNodeData<FormatNodeConfig>(props.id, {
        content: newValue,
      });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal {...props} left={1} right={1} variant="format" title="Format">
      <Button
        className="bg-muted-foreground/10 hover:bg-muted-foreground/20 h-8"
        onClick={() => setOpen(true)}
      >
        Edit Content
      </Button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Edit Code"
        className="w-[360px]"
        description={
          <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg mx-3">
            <p className="text-xs text-muted-foreground">
              Edit the content of the format node.
            </p>
          </div>
        }
      >
        <div className="h-full flex flex-col flex-1">
          <AutoResizeTextarea
            value={content}
            placeholder="Enter the content of the format node."
            onValueChange={handleContentChange}
          />
        </div>
      </Drawer>
    </NodePortal>
  );
};

export const FormatNode = memo(FormatNodeComponent);

export class FormatNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    try {
      const formatConfig = this.node.data as FormatNodeConfig;
      const content = this.parseTextFromInputs(
        formatConfig.content || "",
        inputs,
      );
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });

      this.updateNodeState({
        status: "completed",
        outputs: {
          result: content,
        },
      });

      return {
        success: true,
        data: {
          result: content,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("format", FormatNodeExecutor);
