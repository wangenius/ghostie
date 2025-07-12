import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { IteratorNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const IteratorNodeComponent = (props: NodeProps<IteratorNodeConfig>) => {
  const [content, setContent] = useState(props.data.target || "");
  const workflows = {
    "1": {
      id: "1",
      name: "Workflow 1",
      description: "Workflow 1 description",
    },
  };
  const id = "";
  const { updateNodeData } = useFlow();
  const handleTargetChange = (value: string) => {
    setContent(value);
    updateNodeData(props.id, { target: value });
  };
  const handleActionChange = (value: string) => {
    updateNodeData(props.id, { action: value });
  };
  return (
    <NodePortal
      {...props}
      left={1}
      right={1}
      variant="iterator"
      title="Iterator"
    >
      <Input
        variant="dust"
        className="text-xs transition-colors resize-none p-2"
        value={content}
        onChange={(e) => {
          handleTargetChange(e.target.value);
        }}
        placeholder="Iteration Object"
      />
      <DrawerSelector
        panelTitle="Select Iteration Workflow"
        value={[props.data.action]}
        items={Object.values(workflows)
          .map((workflow) => {
            if (workflow.id !== id) {
              return {
                label: workflow.name || "Unnamed",
                value: workflow.id,
                description: workflow.description,
              };
            }
          })
          .filter((item) => item !== undefined)}
        onSelect={(value) => handleActionChange(value[0])}
      />
    </NodePortal>
  );
};

export const IteratorNode = memo(IteratorNodeComponent);