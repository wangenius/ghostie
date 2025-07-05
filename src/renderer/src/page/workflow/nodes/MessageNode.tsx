import { Textarea } from "@/components/ui/textarea";
import { cmd } from "@/utils/shell";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../../../workflow/execute/NodeExecutor";
import { NotificationNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const NotificationNodeComponent = (
  props: NodeProps<NotificationNodeConfig>,
) => {
  const [message, setMessage] = useState(props.data.message);
  const { updateNodeData } = useFlow();

  const handleSystemChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setMessage(newValue);
      updateNodeData<NotificationNodeConfig>(props.id, {
        message: newValue,
      });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal
      {...props}
      left={1}
      right={1}
      variant="notification"
      title="Notification"
    >
      <div className="space-y-1.5">
        <Textarea
          variant="dust"
          className="text-xs min-h-[80px] transition-colors resize-none p-2"
          value={message}
          onChange={handleSystemChange}
          placeholder="input notification content..."
        />
      </div>
    </NodePortal>
  );
};

export const NotificationNode = memo(NotificationNodeComponent);

export class NotificationNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    try {
      const messageConfig = this.node.data as NotificationNodeConfig;
      const message = this.parseTextFromInputs(
        messageConfig.message || "",
        inputs,
      );

      if (!message) {
        throw new Error("Notification content is empty");
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

NodeExecutor.register("notification", NotificationNodeExecutor);
