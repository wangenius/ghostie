import { useCallback } from "react";
import { Connection, EdgeChange } from "reactflow";
import { EditorWorkflow } from "../WorkflowEditor";
import { gen } from "@/utils/generator";
import { EDGE_CONFIG } from "../constants";

export const useEdges = () => {
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!EditorWorkflow) return;

      changes.forEach((change) => {
        if (change.type === "remove") {
          EditorWorkflow.removeEdge(change.id);
        }
      });
    },
    [EditorWorkflow],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!EditorWorkflow) return;

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

      EditorWorkflow.addEdge(edge);
    },
    [EditorWorkflow],
  );

  return {
    onEdgesChange,
    onConnect,
  };
};
