import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Textarea } from "@/components/ui/textarea";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { AgentNodeConfig, NodeState, WorkflowNode } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const AgentNodeComponent = (props: NodeProps<AgentNodeConfig>) => {
  const agents = {
    "1": {
      id: "1",
      name: "Agent 1",
      system: "Agent 1 system",
      engine: "Agent 1 engine",
    },
  };
  const [prompt, setPrompt] = useState(props.data.prompt);
  const { updateNodeData } = useFlow();

  const handleAgentChange = useCallback(
    (value: string) => {
      updateNodeData<AgentNodeConfig>(props.id, { agent: value });
    },
    [updateNodeData, props.id],
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
      updateNodeData<AgentNodeConfig>(props.id, { prompt: e.target.value });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal {...props} left={1} right={1} variant="agent" title="Agent">
      <DrawerSelector
        panelTitle="Select Agent"
        value={[props.data.agent]}
        items={Object.values(agents).map((agent) => {
          return {
            label: agent.name,
            value: agent.id,
            description: agent.system,
            type: agent.engine,
          };
        })}
        onSelect={(value) => handleAgentChange(value[0])}
      />

      <Textarea
        variant="dust"
        className="text-xs min-h-[80px] transition-colors resize-none p-2"
        value={prompt}
        onChange={handlePromptChange}
        placeholder="Enter content..."
      />
    </NodePortal>
  );
};

export const AgentNode = memo(AgentNodeComponent);