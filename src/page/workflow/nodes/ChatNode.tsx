import { ModelItem } from "@/agent/types/agent";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChatModel } from "@/model/chat/ChatModel";
import { ChatModelManager } from "@/model/chat/ChatModelManager";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { NodeExecutor } from "../../../workflow/execute/NodeExecutor";
import { useFlow } from "../context/FlowContext";
import { ChatNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const ChatNodeComponent = (props: NodeProps<ChatNodeConfig>) => {
  const [system, setSystem] = useState(props.data.system);
  const [user, setUser] = useState(props.data.user);
  const { updateNodeData } = useFlow();

  const handleModelChange = useCallback(
    (model: ModelItem) => {
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
        items={Object.values(ChatModelManager.getProviders()).flatMap(
          (provider) => {
            const key = ChatModelManager.getApiKey(provider.name);
            if (!key) return [];
            const models = provider.models;
            return Object.values(models).map((model) => {
              return {
                label: model.name,
                value: {
                  provider: provider.name,
                  name: model.name,
                },
                type: provider.name,
                description: `${model.description}`,
              };
            });
          },
        )}
        onSelect={(value) => handleModelChange(value[0])}
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
export class ChatNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });

      const chatConfig = this.node.data as ChatNodeConfig;
      if (!chatConfig.model) {
        throw new Error("Chat model not configured");
      }

      const parsedSystem = this.parseTextFromInputs(
        chatConfig.system || "",
        inputs,
      );
      const parsedUser = this.parseTextFromInputs(
        chatConfig.user || "",
        inputs,
      );

      const model = ChatModel.create(chatConfig.model);

      const res = await model.stream([
        { role: "system", content: parsedSystem },
        {
          role: "user",
          content: parsedUser,
        },
      ]);

      if (!res?.body) {
        throw new Error("Chat response is empty");
      }

      this.updateNodeState({
        status: "completed",
        outputs: {
          result: res.body,
        },
      });
      return {
        success: true,
        data: {
          result: res.body,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("chat", ChatNodeExecutor);
