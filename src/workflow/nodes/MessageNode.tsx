import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { MessageNodeConfig } from "../types/nodes";
import { Workflow } from "../execute/Workflow";
import { NodePortal } from "./NodePortal";

const MessageNodeComponent = (props: NodeProps<MessageNodeConfig>) => {
  const [message, setMessage] = useState(props.data.message);
  const workflow = Workflow.instance;

  const handleSystemChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setMessage(newValue);
      workflow.set((s) => ({
        ...s,
        data: {
          ...s.data,
          nodes: {
            ...s.data.nodes,
            [props.id]: {
              ...s.data.nodes[props.id],
              data: {
                ...s.data.nodes[props.id].data,
                message: newValue,
              },
            },
          },
        },
      }));
    },
    [workflow, props.id],
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
