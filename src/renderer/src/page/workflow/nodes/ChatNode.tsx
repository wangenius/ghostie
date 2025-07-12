import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { ChatNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const ChatNodeComponent = (props: NodeProps<ChatNodeConfig>) => {
  const [system, setSystem] = useState(props.data.system);
  const [user, setUser] = useState(props.data.user);
  const { updateNodeData } = useFlow();

  const handleModelChange = useCallback(
    (model: any) => {
      updateNodeData<ChatNodeConfig>(props.id, {
        model: model,
      });
    },
    [updateNodeData, props.id],
  );

  const handleSystemChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setSystem(newValue);
      updateNodeData<ChatNodeConfig>(props.id, { system: newValue });
    },
    [updateNodeData, props.id],
  );

  const handleUserChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setUser(newValue);
      updateNodeData<ChatNodeConfig>(props.id, { user: newValue });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal {...props} left={1} right={1} variant="chat" title="Chat">
      <DrawerSelector
        panelTitle="Select Model"
        value={[props.data.model]}
        items={[]}
        onSelect={() => {}}
      />

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600">
          System Prompt
        </Label>
        <Textarea
          variant="dust"
          className="text-xs min-h-[80px] transition-colors resize-none p-2"
          value={system}
          data-id={`${props.id}-system`}
          onChange={handleSystemChange}
          placeholder="Enter system prompt, you can copy input parameters from other nodes..."
        />

        <Label className="text-xs font-medium text-gray-600 mt-3">
          User Prompt
        </Label>
        <Textarea
          variant="dust"
          className="text-xs min-h-[80px] transition-colors resize-none p-2"
          value={user}
          onChange={handleUserChange}
          placeholder="Enter user prompt, you can copy input parameters from other nodes..."
        />
      </div>
    </NodePortal>
  );
};

export const ChatNode = memo(ChatNodeComponent);