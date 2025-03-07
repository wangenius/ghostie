import { Textarea } from "@/components/ui/textarea";
import { cmd } from "@/utils/shell";
import { motion } from "framer-motion";
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
    <NodePortal {...props} left={1} right={1} variant="message" title="消息">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="space-y-1.5">
          <Textarea
            variant="dust"
            className="text-xs min-h-[80px] transition-colors resize-none p-2"
            value={message}
            onChange={handleSystemChange}
            placeholder="输入消息内容..."
          />
        </div>
      </motion.div>
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
        throw new Error("消息内容为空");
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
      console.error("消息节点执行失败", error);
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("message", MessageNodeExecutor);
