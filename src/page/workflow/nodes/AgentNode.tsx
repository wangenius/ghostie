import { Agent } from "@/agent/Agent";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Textarea } from "@/components/ui/textarea";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../../../workflow/execute/NodeExecutor";
import { AgentNodeConfig, NodeState, WorkflowNode } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { AgentsListStore } from "@/store/agents";

const AgentNodeComponent = (props: NodeProps<AgentNodeConfig>) => {
  const agents = AgentsListStore.use();
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
export class AgentNodeExecutor extends NodeExecutor {
  constructor(
    node: WorkflowNode,
    updateNodeState: (update: Partial<NodeState>) => void,
  ) {
    super(node, updateNodeState);
  }

  public override async execute(inputs: Record<string, any>) {
    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });

      const agentConfig = this.node.data as AgentNodeConfig;
      if (!agentConfig.agent) {
        throw new Error("Agent not configured");
      }

      const agent = new Agent(
        (await AgentsListStore.getCurrent())[agentConfig.agent],
      );
      if (!agent) {
        throw new Error(`Agent not found: ${agentConfig.agent}`);
      }

      const parsedPrompt = this.parseTextFromInputs(
        agentConfig.prompt || "",
        inputs,
      );

      const agentResult = await agent.chat(parsedPrompt);
      if (!agentResult || !agentResult.content) {
        throw new Error("Agent response is empty");
      }

      this.updateNodeState({
        status: "completed",
        outputs: {
          result: agentResult.content,
        },
      });

      return {
        success: true,
        data: {
          result: agentResult.content,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("agent", AgentNodeExecutor);
