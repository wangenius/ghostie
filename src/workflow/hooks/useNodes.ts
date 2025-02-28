import { useCallback } from "react";
import { NodeChange } from "reactflow";
import { EditorWorkflow } from "../WorkflowEditor";
import {
  NodeType,
  WorkflowNode,
  NodeConfig,
  FilterNodeConfig,
  ChatNodeConfig,
  BotNodeConfig,
  PluginNodeConfig,
  BranchNodeConfig,
} from "../types/nodes";
import { gen } from "@/utils/generator";

export const useNodes = () => {
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!EditorWorkflow) return;

      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          EditorWorkflow.updateNodePosition(change.id, change.position);
        } else if (change.type === "remove") {
          EditorWorkflow.removeNode(change.id);
        } else if (change.type === "select") {
          EditorWorkflow.set((state) => ({
            ...state,
            data: {
              ...state.data,
              nodes: {
                ...state.data.nodes,
                [change.id]: {
                  ...state.data.nodes[change.id],
                  selected: change.selected,
                },
              },
            },
          }));
        } else if (change.type === "dimensions") {
          const dimensions = (change as any).dimensions;
          if (dimensions) {
            EditorWorkflow.set((state) => ({
              ...state,
              data: {
                ...state.data,
                nodes: {
                  ...state.data.nodes,
                  [change.id]: {
                    ...state.data.nodes[change.id],
                    width: dimensions.width,
                    height: dimensions.height,
                  },
                },
              },
            }));
          }
        }
      });
    },
    [EditorWorkflow],
  );

  const addNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      if (!EditorWorkflow) return;

      const baseData = {
        type,
        name: type,
        inputs: {},
        outputs: {},
      };

      let nodeData: NodeConfig;
      switch (type) {
        case "start":
        case "end":
          nodeData = { ...baseData } as NodeConfig;
          break;
        case "chat":
          nodeData = {
            ...baseData,
            model: "",
            system: "",
          } as ChatNodeConfig;
          break;
        case "bot":
          nodeData = {
            ...baseData,
            bot: "",
          } as BotNodeConfig;
          break;
        case "plugin":
          nodeData = {
            ...baseData,
            plugin: "",
            tool: "",
            args: {},
          } as PluginNodeConfig;
          break;
        case "branch":
          nodeData = {
            ...baseData,
            conditions: [],
          } as BranchNodeConfig;
          break;
        case "filter":
          nodeData = {
            ...baseData,
            filter: {
              group: {
                conditions: [],
                id: gen.id(),
                type: "AND",
                isEnabled: true,
              },
            },
          } as FilterNodeConfig;
          break;
        default:
          nodeData = baseData as NodeConfig;
      }

      const newNode: WorkflowNode = {
        id: gen.id(),
        type,
        name: type,
        position,
        data: nodeData,
      };

      EditorWorkflow.addNode(newNode);
    },
    [EditorWorkflow],
  );

  return {
    onNodesChange,
    addNode,
  };
};
