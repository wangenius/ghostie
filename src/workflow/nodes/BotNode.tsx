import { BotManager } from "@/bot/BotManger";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { NodeProps } from "reactflow";
import { BotNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { EditorWorkflow } from "../WorkflowEditor";

export const BotNode = (props: NodeProps<BotNodeConfig>) => {
  const bots = BotManager.use();

  const st = EditorWorkflow.use((s) => s.nodeStates[props.id]);

  return (
    <NodePortal {...props} left={1} right={1} variant="bot" title="机器人">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">
            选择机器人
          </Label>
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
              <SelectValue placeholder="选择机器人" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(bots).map((bot) => (
                <SelectItem key={bot.id} value={bot.id} className="text-sm">
                  {bot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 执行结果 */}
        {(st.status === "completed" || st.status === "failed") && (
          <div className="font-medium text-green-700">{st.outputs.result}</div>
        )}
      </motion.div>
    </NodePortal>
  );
};
