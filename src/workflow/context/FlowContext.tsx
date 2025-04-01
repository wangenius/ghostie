import { gen } from "@/utils/generator";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  Connection,
  Edge,
  Node,
  useEdgesState,
  useNodesState,
  useReactFlow,
  Viewport,
} from "reactflow";
import { ContextWorkflow } from "../execute/Workflow";
import type { WorkflowEdgeData } from "../types/edges";
import { EDGE_CONFIG, NODE_TYPES, NodeConfig, NodeType } from "../types/nodes";

interface FlowContextType {
  nodes: Node<NodeConfig>[];
  edges: Edge[];
  setNodes: React.Dispatch<
    React.SetStateAction<Node<NodeConfig, string | undefined>[]>
  >;
  setEdges: (edges: Edge<WorkflowEdgeData>[]) => void;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onMoveEnd: (event: any, viewport: Viewport) => void;
  onConnect: (params: Connection) => void;
  updateNodeData: <T extends NodeConfig>(
    id: string,
    selector: ((data: T) => Partial<T>) | Partial<T>,
  ) => void;
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
}

const FlowContext = createContext<FlowContextType | null>(null);

/* 当前工作流上下文 */
export const FlowProvider = ({ children }: { children: React.ReactNode }) => {
  const id = ContextWorkflow.use((selector) => selector.meta.id);
  const body = ContextWorkflow.use((selector) => selector.body);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeConfig>(
    Object.values(body.nodes),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    Object.values(body.edges),
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      if (!NODE_TYPES[type as NodeType]) {
        return;
      }

      if (typeof type === "string" && reactFlowWrapper.current) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        setNodes((prev) =>
          prev.concat([
            {
              id: gen.id(),
              type: type as NodeType,
              position: {
                x: position.x,
                y: position.y,
              },
              data: {} as NodeConfig,
            },
          ]),
        );
      }
    },
    [screenToFlowPosition],
  );

  const onMoveEnd = useCallback(
    (_: any, viewport: Viewport) => {
      ContextWorkflow.updateBody({
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        },
      });
    },
    [ContextWorkflow],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!ContextWorkflow) return;

      const sourceId = params.sourceHandle || "";
      const targetId = params.targetHandle || "";

      if (!sourceId || !targetId || !params.source || !params.target) {
        console.warn("无法创建连接：缺少必要的连接信息");
        return;
      }

      const edge: Edge<WorkflowEdgeData> = {
        ...params,
        id: gen.id(),
        source: params.source,
        target: params.target,
        ...EDGE_CONFIG,
        data: {
          type: "default",
          sourceHandle: sourceId,
          targetHandle: targetId,
        },
      };
      setEdges((eds) => [...eds, edge]);
    },
    [ContextWorkflow],
  );

  useEffect(() => {
    setNodes(Object.values(body.nodes));
    setEdges(Object.values(body.edges));
  }, [id]);

  useEffect(() => {
    ContextWorkflow.updateBody({
      edges: {
        ...edges.reduce((acc, edge) => {
          acc[edge.id] = edge;
          return acc;
        }, {} as Record<string, any>),
      },
      nodes: {
        ...nodes.reduce((acc, node) => {
          acc[node.id] = node;
          return acc;
        }, {} as Record<string, any>),
      },
    });
  }, [nodes, edges, ContextWorkflow]);

  const updateNodeData = useCallback(
    <T extends NodeConfig>(
      id: string,
      selector: ((data: T) => Partial<T>) | Partial<T>,
    ) => {
      setNodes((nds) => {
        return nds.map((nd) => {
          if (nd.id == id) {
            return {
              ...nd,
              data: {
                ...nd.data,
                ...(typeof selector === "function"
                  ? selector(nd.data as T)
                  : selector),
              },
            };
          }
          return nd;
        });
      });
    },
    [nodes],
  );
  const value = {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onDragOver,
    onDrop,
    onMoveEnd,
    onConnect,
    reactFlowWrapper,
    updateNodeData,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};

export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error("useFlow must be used within a FlowProvider");
  }
  return context;
};
