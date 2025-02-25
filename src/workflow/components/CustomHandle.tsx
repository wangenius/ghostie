import { memo, useMemo } from "react";
import { getConnectedEdges, Handle, useNodeId, useStore } from "reactflow";

const selector = (s: any) => ({
  nodeInternals: s.nodeInternals,
  edges: s.edges,
});

const CustomHandle = memo((props: any) => {
  const { nodeInternals, edges } = useStore(selector);
  const nodeId = useNodeId();

  const isHandleConnectable = useMemo(() => {
    if (!nodeId) return false;

    const node = nodeInternals.get(nodeId);
    if (!node) return false;

    const connectedEdges = getConnectedEdges([node], edges);

    // 检查当前 handle 的连接
    const handleEdges = connectedEdges.filter((edge) => {
      if (props.type === 'source') {
        return edge.sourceHandle === props.id;
      } else {
        return edge.targetHandle === props.id;
      }
    });

    if (typeof props.isConnectable === "function") {
      return props.isConnectable({ node, connectedEdges: handleEdges });
    }

    if (typeof props.isConnectable === "number") {
      return handleEdges.length < props.isConnectable;
    }

    return props.isConnectable;
  }, [nodeInternals, edges, nodeId, props.id, props.type, props.isConnectable]);

  return (
    <Handle
      {...props}
      onDoubleClick={(e) => e.stopPropagation()}
      isConnectable={isHandleConnectable}
    />
  );
});

export default CustomHandle;
