import { Textarea } from "@/components/ui/textarea";
import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../execute/NodeExecutor";
import { EndNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const EndNodeComponent = (props: NodeProps<EndNodeConfig>) => {
  const [content, setContent] = useState(props.data.content || "");
  const { updateNodeData } = useFlow();

  const handleSystemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    updateNodeData(props.id, {
      content: e.target.value,
    });
  };

  return (
    <NodePortal {...props} left={1} right={0} variant="end" title="结束">
      <Textarea
        variant="dust"
        className="text-xs min-h-[80px] transition-colors resize-none p-2"
        value={content}
        onChange={handleSystemChange}
        placeholder="输入内容..."
      />
    </NodePortal>
  );
};

export const EndNode = memo(EndNodeComponent);

export class EndNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    this.updateNodeState({
      status: "running",
      startTime: new Date().toISOString(),
      inputs,
    });

    const content = this.node.data as EndNodeConfig;

    const contentText = this.parseTextFromInputs(content.content || "", inputs);

    this.updateNodeState({
      status: "completed",
      outputs: {
        result: contentText,
      },
    });
    return {
      success: true,
      data: contentText,
    };
  }
}

NodeExecutor.register("end", EndNodeExecutor);
