import { BotManager } from "@/bot/BotManger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { useState } from "react";
import { NodeProps } from "reactflow";
import { BotNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { EditorWorkflow } from "../WorkflowEditor";
import { Bot } from "lucide-react";

export const BotNode = (props: NodeProps<BotNodeConfig>) => {
  const bots = BotManager.use();
  const [prompt, setPrompt] = useState(props.data.prompt);
  const st = EditorWorkflow.use((s) => s.nodeStates[props.id]);

  return (
    <NodePortal
      {...props}
      left={1}
      right={1}
      variant="bot"
      title="机器人"
      state={st.status}
      outputs={st.outputs}
    >
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Select
          value={props.data.bot}
          onValueChange={(value) => {
            EditorWorkflow.set((state) => ({
              ...state,
              data: {
                ...state.data,
                nodes: {
                  ...state.data.nodes,
                  [props.id]: {
                    ...state.data.nodes[props.id],
                    data: {
                      ...state.data.nodes[props.id].data,
                      bot: value,
                    },
                  },
                },
              },
            }));
          }}
        >
          <SelectTrigger variant="dust" className="h-8 transition-colors">
            <Bot className="h-4 w-4" />
            <SelectValue placeholder="选择机器人" className="flex-1" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(bots).map((bot) => (
              <SelectItem key={bot.id} value={bot.id} className="text-sm">
                {bot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          variant="dust"
          className="text-xs min-h-[80px] transition-colors resize-none p-2"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            EditorWorkflow.set((s) => ({
              ...s,
              data: {
                ...s.data,
                nodes: {
                  ...s.data.nodes,
                  [props.id]: {
                    ...s.data.nodes[props.id],
                    data: {
                      ...s.data.nodes[props.id].data,
                      prompt: e.target.value,
                    },
                  },
                },
              },
            }));
          }}
          placeholder="输入内容..."
        />
      </motion.div>
    </NodePortal>
  );
};
