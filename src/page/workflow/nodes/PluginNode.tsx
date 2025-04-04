import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { ToolPlugin } from "@/plugin/ToolPlugin";
import { cmd } from "@/utils/shell";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../../../workflow/execute/NodeExecutor";
import { NodeState, PluginNodeConfig, WorkflowNode } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { EchoManager } from "echo-state";
import { PLUGIN_DATABASE_INDEX } from "@/plugin/ToolPlugin";
const PluginNodeComponent = (props: NodeProps<PluginNodeConfig>) => {
  const plugins = EchoManager.use<ToolPlugin>(PLUGIN_DATABASE_INDEX);
  const { updateNodeData } = useFlow();
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({});

  // 同步外部数据到本地状态
  useEffect(() => {
    if (props.data.args) {
      setLocalInputs(
        Object.entries(props.data.args).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: String(value),
          }),
          {},
        ),
      );
    }
  }, [props.data.plugin, props.data.tool]);

  const handlePluginChange = useCallback(
    (value: string) => {
      const [plugin, tool] = value.split("::");

      updateNodeData<PluginNodeConfig>(props.id, {
        plugin,
        tool,
        args: {},
      });
    },
    [updateNodeData, props.id],
  );

  const handleParameterChange = useCallback(
    (key: string, value: string, type: string) => {
      // 立即更新本地状态
      setLocalInputs((prev) => ({
        ...prev,
        [key]: value,
      }));

      // 使用setTimeout来模拟防抖，300ms后更新父组件状态
      const timer = setTimeout(() => {
        updateNodeData<PluginNodeConfig>(props.id, (data) => ({
          args: {
            ...data.args,
            [key]: type === "number" ? Number(value) : value,
          },
        }));
      }, 300);

      return () => clearTimeout(timer);
    },
    [updateNodeData, props.id],
  );

  const parameterItems = useMemo(() => {
    if (!props.data.plugin || !props.data.tool) return null;

    const toolParameters =
      plugins
        .find((p) => p.props.id === props.data.plugin)
        ?.props.tools.find((t) => t.name === props.data.tool)?.parameters
        ?.properties || {};

    return Object.entries(toolParameters).map(([key, prop]) => (
      <div key={key} className="flex flex-col gap-1">
        <div className="text-xs text-gray-500">{key}</div>
        <Input
          type={prop.type === "number" ? "number" : "text"}
          className="h-8 px-2 text-xs rounded-md border"
          variant="dust"
          value={localInputs[key] || ""}
          onChange={(e) =>
            handleParameterChange(key, e.target.value, prop.type)
          }
          placeholder={`Enter ${key}...`}
        />
      </div>
    ));
  }, [
    plugins,
    props.data.plugin,
    props.data.tool,
    localInputs,
    handleParameterChange,
  ]);

  return (
    <NodePortal {...props} left={1} right={1} variant="plugin" title="Plugin">
      <DrawerSelector
        panelTitle="Select Plugin"
        value={[props.data.plugin + "::" + props.data.tool]}
        items={Object.values(plugins)
          .map((plugin) => {
            return plugin.props.tools.map((tool) => ({
              label: tool.name,
              value: plugin.props.id + "::" + tool.name,
              description: tool.description,
              type: plugin.props.name,
            }));
          })
          .flat()}
        onSelect={(value) => handlePluginChange(value[0])}
      />

      {plugins.find((p) => p.props.id === props.data.plugin) && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium">Parameter Settings</div>
          {parameterItems}
        </div>
      )}
    </NodePortal>
  );
};

export const PluginNode = memo(PluginNodeComponent);
export class PluginNodeExecutor extends NodeExecutor {
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

      const pluginConfig = this.node.data as PluginNodeConfig;
      if (!pluginConfig.plugin) {
        throw new Error("Plugin not configured");
      }

      const plugin = await ToolPlugin.get(pluginConfig.plugin);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginConfig.plugin}`);
      }

      const tool = plugin.props.tools.find((t) => t.name === pluginConfig.tool);
      if (!tool) {
        throw new Error(`Tool not found: ${pluginConfig.tool}`);
      }

      const processedArgs = Object.entries(pluginConfig.args || {}).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]:
            typeof value === "string"
              ? this.parseTextFromInputs(value, inputs)
              : value,
        }),
        {},
      );

      const pluginResult = await cmd.invoke("plugin_execute", {
        id: plugin.props.id,
        tool: pluginConfig.tool,
        args: processedArgs,
      });

      if (!pluginResult) {
        throw new Error("Plugin execution result is empty");
      }

      this.updateNodeState({
        status: "completed",
        outputs: {
          result: pluginResult,
        },
      });
      return {
        success: true,
        data: {
          result: pluginResult,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("plugin", PluginNodeExecutor);
