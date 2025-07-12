import { Textarea } from "@/components/ui/textarea";
import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
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
    <NodePortal {...props} left={1} right={0} variant="end" title="End">
      <Textarea
        variant="dust"
        className="text-xs min-h-[80px] transition-colors resize-none p-2"
        value={content}
        onChange={handleSystemChange}
        placeholder="Enter content..."
      />
    </NodePortal>
  );
};

export const EndNode = memo(EndNodeComponent);


