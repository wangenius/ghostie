import { Textarea } from "@/components/ui/textarea";
import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { SwitchNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const SwitchNodeComponent = (props: NodeProps<SwitchNodeConfig>) => {
  const [condition, setCondition] = useState(props.data.condition || "");
  const { updateNodeData } = useFlow();
  const handleConditionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCondition(e.target.value);
    updateNodeData(props.id, {
      ...props.data,
      condition: e.target.value,
    });
  };
  return (
    <NodePortal {...props} left={1} right={1} variant="switch" title="Switch">
      <Textarea
        variant="dust"
        className="text-xs h-16 resize-none p-2"
        placeholder="Enter condition"
        value={condition}
        onChange={handleConditionChange}
      />
    </NodePortal>
  );
};

export const SwitchNode = memo(SwitchNodeComponent);



