import { BotManager } from "@/bot/BotManger";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { BotNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
const BotNodeComponent = (props: NodeProps<BotNodeConfig>) => {
  const bots = BotManager.use();
  const [prompt, setPrompt] = useState(props.data.prompt);
  const { updateNodeData } = useFlow();

  const handleBotChange = useCallback(
    (value: string) => {
      updateNodeData<BotNodeConfig>(props.id, { bot: value });
    },
    [updateNodeData, props.id],
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
      updateNodeData<BotNodeConfig>(props.id, { prompt: e.target.value });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal {...props} left={1} right={1} variant="bot" title="机器人">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <DrawerSelector
          panelTitle="选择机器人"
          value={[props.data.bot]}
          items={Object.values(bots).map((bot) => {
            return {
              label: bot.name,
              value: bot.id,
              description: bot.system,
              type: bot.mode,
            };
          })}
          onSelect={(value) => handleBotChange(value[0])}
        />

        <Textarea
          variant="dust"
          className="text-xs min-h-[80px] transition-colors resize-none p-2"
          value={prompt}
          onChange={handlePromptChange}
          placeholder="输入内容..."
        />
      </motion.div>
    </NodePortal>
  );
};

export const BotNode = memo(BotNodeComponent);
