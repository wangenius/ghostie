import { memo, useMemo } from "react";
import { getConnectedEdges, Handle, useNodeId, useStore } from "reactflow";

const selector = (s: any) => ({
  nodeInternals: s.nodeInternals,
  edges: s.edges,
});

/* 自定义连接点组件，用于正确处理多个连接点的情况*/
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
      if (props.type === "source") {
        return edge.sourceHandle === props.id && edge.source === nodeId;
      } else {
        return edge.targetHandle === props.id && edge.target === nodeId;
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
      className={`!absolute !w-2 !h-5 !border-2 !rounded-full !cursor-pointer z-10 
							transition-all duration-300 hover:!bg-primary/50
							translate-x-0.5  !bg-muted-foreground !border-primary`}
    />
  );
});

export default CustomHandle;
