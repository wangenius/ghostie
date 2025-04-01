import { Textarea } from "@/components/ui/textarea";
import { cmd } from "@/utils/shell";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../execute/NodeExecutor";
import { MessageNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const MessageNodeComponent = (props: NodeProps<MessageNodeConfig>) => {
  const [message, setMessage] = useState(props.data.message);
  const { updateNodeData } = useFlow();

  const handleSystemChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setMessage(newValue);
      updateNodeData<MessageNodeConfig>(props.id, {
        message: newValue,
      });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal {...props} left={1} right={1} variant="message" title="Message">
      <div className="space-y-1.5">
        <Textarea
          variant="dust"
          className="text-xs min-h-[80px] transition-colors resize-none p-2"
          value={message}
          onChange={handleSystemChange}
          placeholder="input message content..."
        />
      </div>
    </NodePortal>
  );
};

export const MessageNode = memo(MessageNodeComponent);

export class MessageNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    try {
      const messageConfig = this.node.data as MessageNodeConfig;
      const message = this.parseTextFromInputs(
        messageConfig.message || "",
        inputs,
      );

      if (!message) {
        throw new Error("Message content is empty");
      }

      await cmd.notify(message);
      this.updateNodeState({
        status: "completed",
        outputs: {
          result: message,
        },
      });
      return {
        success: true,
        data: {
          result: message,
        },
      };
    } catch (error) {
      console.error("Message node execution failed", error);
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("message", MessageNodeExecutor);
