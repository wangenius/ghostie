import { Bot } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Textarea } from "@/components/ui/textarea";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../execute/NodeExecutor";
import { BotNodeConfig, NodeState, WorkflowNode } from "../types/nodes";
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
    <NodePortal {...props} left={1} right={1} variant="bot" title="Bot">
      <DrawerSelector
        panelTitle="Select Bot"
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
        placeholder="Enter content..."
      />
    </NodePortal>
  );
};

export const BotNode = memo(BotNodeComponent);
export class BotNodeExecutor extends NodeExecutor {
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

      const botConfig = this.node.data as BotNodeConfig;
      if (!botConfig.bot) {
        throw new Error("Bot not configured");
      }

      const bot = BotManager.get(botConfig.bot);
      if (!bot) {
        throw new Error(`Bot not found: ${botConfig.bot}`);
      }

      const parsedPrompt = this.parseTextFromInputs(
        botConfig.prompt || "",
        inputs,
      );

      const botResult = await (await Bot.get(bot.id)).chat(parsedPrompt);
      if (!botResult || !botResult.content) {
        throw new Error("Bot response is empty");
      }

      this.updateNodeState({
        status: "completed",
        outputs: {
          result: botResult.content,
        },
      });

      return {
        success: true,
        data: {
          result: botResult.content,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("bot", BotNodeExecutor);
