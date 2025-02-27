import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ModelManager } from "@/model/ModelManager";
import { useState } from "react";
import { NodeProps } from "reactflow";
import { ChatNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EditorWorkflow } from "../WorkflowEditor";

export const ChatNode = (props: NodeProps<ChatNodeConfig>) => {
  const models = ModelManager.use();
  const [system, setSystem] = useState(props.data.system);

  const st = EditorWorkflow.use((s) => s.nodeStates[props.id]);

  return (
    <NodePortal
      {...props}
      left={1}
      right={1}
      variant="chat"
      title="对话"
      state={st.status}
    >
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 执行状态 */}
        {st.status === "running" && (
          <div className="text-xs p-2 rounded border bg-blue-50 border-blue-200">
            <div className="font-medium text-blue-700">正在执行对话...</div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">选择模型</Label>
          <Select
            value={props.data.model}
            onValueChange={(value) => {
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
                        model: value,
                      },
                    },
                  },
                },
              }));
            }}
          >
            <SelectTrigger variant="dust" className="h-8 transition-colors">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(models).map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-sm">
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">
            系统提示词
          </Label>
          <Textarea
            variant="dust"
            className="text-xs min-h-[80px] transition-colors resize-none p-2"
            value={system}
            onChange={(e) => {
              setSystem(e.target.value);
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
                        system: e.target.value,
                      },
                    },
                  },
                },
              }));
            }}
            placeholder="输入系统提示词..."
          />
        </div>

        {/* 执行结果 */}
        {(st.status === "completed" || st.status === "failed") && (
          <div
            className={cn(
              "text-xs p-2 rounded border",
              st.status === "completed"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200",
            )}
          >
            {st.status === "completed" ? (
              <div className="font-medium text-green-700">
                {st.outputs.result}
              </div>
            ) : (
              <div className="font-medium text-red-700">{st.error}</div>
            )}
          </div>
        )}
      </motion.div>
    </NodePortal>
  );
};
