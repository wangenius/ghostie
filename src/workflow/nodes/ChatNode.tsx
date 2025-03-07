import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModelManager } from "@/model/ModelManager";
import { motion } from "framer-motion";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { ChatNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const ChatNodeComponent = (props: NodeProps<ChatNodeConfig>) => {
  const models = ModelManager.use();
  const [system, setSystem] = useState(props.data.system);
  const [user, setUser] = useState(props.data.user);
  const { updateNodeData } = useFlow();

  const handleModelChange = useCallback(
    (model: string) => {
      updateNodeData<ChatNodeConfig>(props.id, { model });
    },
    [updateNodeData, props.id],
  );

  const handleSystemChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setSystem(newValue);
      updateNodeData<ChatNodeConfig>(props.id, { system: newValue });
    },
    [updateNodeData, props.id],
  );

  const handleUserChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setUser(newValue);
      updateNodeData<ChatNodeConfig>(props.id, { user: newValue });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal {...props} left={1} right={1} variant="chat" title="对话">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <DrawerSelector
          panelTitle="选择模型"
          value={[props.data.model]}
          items={Object.values(models).map((model) => {
            return {
              label: model.name,
              value: model.id,
              type: model.type,
            };
          })}
          onSelect={(value) => handleModelChange(value[0])}
        />

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">
            系统提示词
          </Label>
          <Textarea
            variant="dust"
            className="text-xs min-h-[80px] transition-colors resize-none p-2"
            value={system}
            data-id={`${props.id}-system`}
            onChange={handleSystemChange}
            placeholder="输入系统提示词，可以从其他节点复制输入参数..."
          />

          <Label className="text-xs font-medium text-gray-600 mt-3">
            用户提示词
          </Label>
          <Textarea
            variant="dust"
            className="text-xs min-h-[80px] transition-colors resize-none p-2"
            value={user}
            onChange={handleUserChange}
            placeholder="输入用户提示词，可以从其他节点复制输入参数..."
          />
        </div>
      </motion.div>
    </NodePortal>
  );
};

export const ChatNode = memo(ChatNodeComponent);
