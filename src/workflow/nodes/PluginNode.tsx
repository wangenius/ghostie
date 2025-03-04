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
import { memo, useCallback, useMemo } from "react";
import { NodeProps } from "reactflow";
import { PluginNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { Workflow } from "../Workflow";

const PluginNodeComponent = (props: NodeProps<PluginNodeConfig>) => {
  const plugins = PluginManager.use();
  const workflow = Workflow.instance;
  const selectedPlugin = plugins[props.data.plugin] as PluginProps | undefined;

  const handlePluginChange = useCallback(
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
                plugin: value,
                tool: "", // 重置工具选择
                args: {}, // 重置参数
              },
            },
          },
        },
      }));
    },
    [workflow, props.id],
  );

  const handleToolChange = useCallback(
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
                tool: value,
                args: {}, // 重置参数
              },
            },
          },
        },
      }));
    },
    [workflow, props.id],
  );

  const handleParameterChange = useCallback(
    (key: string, value: string, type: string) => {
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
                  [key]: type === "number" ? Number(value) : value,
                },
              },
            },
          },
        },
      }));
    },
    [workflow, props.id],
  );

  const pluginItems = useMemo(
    () =>
      Object.entries(plugins).map(([id, plugin]) => (
        <SelectItem key={id} value={id} className="text-sm">
          {plugin.name}
        </SelectItem>
      )),
    [plugins],
  );

  const toolItems = useMemo(
    () =>
      selectedPlugin?.tools.map((tool) => (
        <SelectItem key={tool.name} value={tool.name} className="text-sm">
          {tool.name}
        </SelectItem>
      )),
    [selectedPlugin],
  );

  const parameterItems = useMemo(() => {
    if (!selectedPlugin || !props.data.tool) return null;

    const toolParameters =
      selectedPlugin.tools.find((t) => t.name === props.data.tool)?.parameters
        ?.properties || {};

    return Object.entries(toolParameters).map(([key, prop]) => (
      <div key={key} className="flex flex-col gap-1">
        <div className="text-xs text-gray-500">{key}</div>
        <input
          type={prop.type === "number" ? "number" : "text"}
          className="h-8 px-2 text-xs rounded-md border bg-background transition-colors"
          value={props.data.args?.[key] || ""}
          onChange={(e) =>
            handleParameterChange(key, e.target.value, prop.type)
          }
          placeholder={`输入${key}...`}
        />
      </div>
    ));
  }, [selectedPlugin, props.data.tool, props.data.args, handleParameterChange]);

  return (
    <NodePortal {...props} left={1} right={1} variant="plugin" title="插件">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Select value={props.data.plugin} onValueChange={handlePluginChange}>
          <SelectTrigger variant="dust" className="h-8 transition-colors">
            <Puzzle className="h-4 w-4" />
            <SelectValue placeholder="选择插件" className="flex-1" />
          </SelectTrigger>
          <SelectContent>{pluginItems}</SelectContent>
        </Select>

        {selectedPlugin && (
          <Select value={props.data.tool} onValueChange={handleToolChange}>
            <SelectTrigger variant="dust" className="h-8 transition-colors">
              <SelectValue placeholder="选择工具" className="flex-1" />
            </SelectTrigger>
            <SelectContent>{toolItems}</SelectContent>
          </Select>
        )}

        {selectedPlugin && props.data.tool && (
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium">参数设置</div>
            {parameterItems}
          </div>
        )}
      </motion.div>
    </NodePortal>
  );
};

export const PluginNode = memo(PluginNodeComponent);
