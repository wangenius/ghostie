import { PluginProps } from "@/common/types/plugin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PluginManager } from "@/plugin/PluginManager";
import { motion } from "framer-motion";
import { Puzzle } from "lucide-react";
import { NodeProps } from "reactflow";
import { PluginNodeConfig } from "../types/nodes";
import { useEditorWorkflow } from "../context/EditorContext";
import { NodePortal } from "./NodePortal";

export const PluginNode = (props: NodeProps<PluginNodeConfig>) => {
  const plugins = PluginManager.use();
  const workflow = useEditorWorkflow();
  const workflowState = workflow.use();
  const selectedPlugin = plugins[props.data.plugin] as PluginProps | undefined;

  return (
    <NodePortal
      {...props}
      left={1}
      right={1}
      variant="plugin"
      title="插件"
      state={workflowState.nodeStates[props.id].status}
      outputs={workflowState.nodeStates[props.id].outputs}
    >
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Select
          value={props.data.plugin}
          onValueChange={(value) => {
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
                      plugin: value,
                      tool: "", // 重置工具选择
                      args: {}, // 重置参数
                    },
                  },
                },
              },
            }));
          }}
        >
          <SelectTrigger variant="dust" className="h-8 transition-colors">
            <Puzzle className="h-4 w-4" />
            <SelectValue placeholder="选择插件" className="flex-1" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(plugins).map(([id, plugin]) => (
              <SelectItem key={id} value={id} className="text-sm">
                {plugin.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPlugin && (
          <Select
            value={props.data.tool}
            onValueChange={(value) => {
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
                        tool: value,
                        args: {}, // 重置参数
                      },
                    },
                  },
                },
              }));
            }}
          >
            <SelectTrigger variant="dust" className="h-8 transition-colors">
              <SelectValue placeholder="选择工具" className="flex-1" />
            </SelectTrigger>
            <SelectContent>
              {selectedPlugin.tools.map((tool) => (
                <SelectItem
                  key={tool.name}
                  value={tool.name}
                  className="text-sm"
                >
                  {tool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedPlugin && props.data.tool && (
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium">参数设置</div>
            {Object.entries(
              selectedPlugin.tools.find((t) => t.name === props.data.tool)
                ?.parameters?.properties || {},
            ).map(([key, prop]) => (
              <div key={key} className="flex flex-col gap-1">
                <div className="text-xs text-gray-500">{key}</div>
                <input
                  type={prop.type === "number" ? "number" : "text"}
                  className="h-8 px-2 text-xs rounded-md border bg-background transition-colors"
                  value={props.data.args?.[key] || ""}
                  onChange={(e) => {
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
                              args: {
                                ...state.data.nodes[props.id].data.args,
                                [key]:
                                  prop.type === "number"
                                    ? Number(e.target.value)
                                    : e.target.value,
                              },
                            },
                          },
                        },
                      },
                    }));
                  }}
                  placeholder={`输入${key}...`}
                />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </NodePortal>
  );
};
