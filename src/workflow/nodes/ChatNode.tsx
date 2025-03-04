import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModelManager } from "@/model/ModelManager";
import { motion } from "framer-motion";
import { memo, useCallback, useState } from "react";
import { TbBox } from "react-icons/tb";
import { NodeProps } from "reactflow";
import { useEditorWorkflow } from "../context/EditorContext";
import { ChatNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { cn } from "@/lib/utils";

const ChatNodeComponent = (props: NodeProps<ChatNodeConfig>) => {
  const models = ModelManager.use();
  const [system, setSystem] = useState(props.data.system);
  const [user, setUser] = useState(props.data.user);
  const workflow = useEditorWorkflow();

  const handleModelChange = useCallback(
    (value: string) => {
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
                model: value,
              },
            },
          },
        },
      }));
    },
    [workflow, props.id],
  );

  const handleSystemChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setSystem(newValue);
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
                system: newValue,
              },
            },
          },
        },
      }));
    },
    [workflow, props.id],
  );

  const handleUserChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setUser(newValue);
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
                user: newValue,
              },
            },
          },
        },
      }));
    },
    [workflow, props.id],
  );

  const [open, setOpen] = useState(false);

  return (
    <NodePortal {...props} left={1} right={1} variant="chat" title="对话">
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
            <TbBox />
            {models[props.data.model]?.name || "选择模型"}
          </Button>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <h3 className="font-bold mb-4">选择模型</h3>
          {Object.values(models).map((model) => (
            <div
              key={model.id}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg hover:bg-muted-foreground/20 cursor-pointer transition-colors",
                props.data.model === model.id && "bg-muted-foreground/10",
              )}
              onClick={() => {
                handleModelChange(model.id);
              }}
            >
              <div className="flex items-center gap-2">
                <TbBox className="h-4 w-4 text-primary flex-none" />
                <span className="font-medium">{model.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {model.model}
              </span>
            </div>
          ))}
        </Drawer>

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
