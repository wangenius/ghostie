import { useCallback } from "react";
import { Connection, EdgeChange } from "reactflow";
import { gen } from "@/utils/generator";
import { EDGE_CONFIG } from "../constants";
import { Workflow } from "../Workflow";

export const useEdges = () => {
  const workflow = Workflow.instance;

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!workflow) return;

      changes.forEach((change) => {
        if (change.type === "remove") {
          workflow.removeEdge(change.id);
        }
      });
    },
    [workflow],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!workflow) return;

      const sourceId = params.sourceHandle || "";
      const targetId = params.targetHandle || "";

      if (!sourceId || !targetId) {
        console.warn("无法创建连接：缺少源或目标连接点ID");
        return;
      }

      const edge = {
        ...params,
        id: gen.id(),
        ...EDGE_CONFIG,
        data: {
          type: "default",
          sourceHandle: sourceId,
          targetHandle: targetId,
        },
      };

      workflow.addEdge(edge);
    },
    [workflow],
  );

  return {
    onEdgesChange,
    onConnect,
  };
};
