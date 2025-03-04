import { BotManager } from "@/bot/BotManger";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { memo, useCallback, useState } from "react";
import { TbGhost3 } from "react-icons/tb";
import { NodeProps } from "reactflow";
import { useEditorWorkflow } from "../context/EditorContext";
import { BotNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const BotNodeComponent = (props: NodeProps<BotNodeConfig>) => {
  const bots = BotManager.use();
  const [prompt, setPrompt] = useState(props.data.prompt);
  const workflow = useEditorWorkflow();
  const [open, setOpen] = useState(false);

  const handleBotChange = useCallback(
    (value: string) => {
      workflow.set((state) => ({
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
    },
    [workflow, props.id],
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setPrompt(newValue);
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
                prompt: newValue,
              },
            },
          },
        },
      }));
    },
    [workflow, props.id],
  );

  return (
    <NodePortal {...props} left={1} right={1} variant="bot" title="机器人">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="space-y-1.5">
          <Button
            onClick={() => setOpen(true)}
            variant="ghost"
            className="w-full bg-muted-foreground/10"
          >
            <TbGhost3 />
            {bots[props.data.bot]?.name || "选择机器人"}
          </Button>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <h3 className="font-bold mb-4">选择机器人</h3>
          {Object.values(bots).map((bot) => (
            <div
              key={bot.id}
              className={cn(
                "flex items-center justify-start w-full px-3 py-2 text-sm rounded-lg hover:bg-muted-foreground/20 cursor-pointer transition-colors gap-2 overflow-hidden",
                props.data.bot === bot.id && "bg-muted-foreground/10",
              )}
              onClick={() => {
                handleBotChange(bot.id);
              }}
            >
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <TbGhost3 className="h-4 w-4 text-primary flex-none" />
              </Button>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{bot.name}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {bot.system}
                </span>
              </div>
            </div>
          ))}
        </Drawer>

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
