import { gen } from "@/utils/generator";
import { WORKFLOW_BODY_DATABASE } from "@/workflow/const";
import { CurrentWorkflow } from "@/workflow/Workflow";
import { Echo } from "echo-state";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  useReactFlow,
  Viewport,
} from "reactflow";
import type { WorkflowEdge } from "../types/edges";
import {
  EDGE_CONFIG,
  NODE_TYPES,
  NodeConfig,
  NodeType,
  WorkflowBody,
  WorkflowNode,
} from "../types/nodes";
/* 工作流上下文类型 */
interface FlowContextType {
  /* 当前工作流节点 */
  nodes: Node<NodeConfig>[];
  /* 当前工作流边 */
  edges: Edge[];
  /* 当前工作流视图 */
  viewport: Viewport;
  /* 工作流节点变化 */
  onNodesChange: (changes: NodeChange[]) => void;
  /* 工作流边变化 */
  onEdgesChange: (changes: EdgeChange[]) => void;
  /* 拖拽节点 */
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  /* 放置节点 */
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  /* 移动结束 */
  onMoveEnd: (event: any, viewport: Viewport) => void;
  /* 连接节点 */
  onConnect: (params: Connection) => void;
  /* 更新节点数据 */
  updateNodeData: <T extends NodeConfig>(
    id: string,
    selector: ((data: T) => Partial<T>) | Partial<T>,
  ) => void;
  /* 工作流容器 */
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
}

/* 工作流上下文 */
const FlowContext = createContext<FlowContextType | null>(null);

export const CurrentEditWorkflow = new Echo<WorkflowBody>({
  id: "",
  nodes: {},
  edges: {},
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
}).indexed({
  database: WORKFLOW_BODY_DATABASE,
  name: "",
});

/* 当前工作流上下文 */
export const FlowProvider = ({ children }: { children: React.ReactNode }) => {
  const workflow = CurrentWorkflow.use();
  const body = CurrentEditWorkflow.use();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    let isActive = true;

    if (workflow.meta.id) {
      CurrentEditWorkflow.indexed({
        database: WORKFLOW_BODY_DATABASE,
        name: workflow.meta.id,
      })
        .getCurrent()
        .then((loadedBody) => {
          // Ensure loadedBody has default structure if empty/new
          const ensuredBody: WorkflowBody = {
            id: loadedBody.id || workflow.meta.id || gen.id(), // Use workflow id or generate one
            nodes: loadedBody.nodes || {},
            edges: loadedBody.edges || {},
            viewport: loadedBody.viewport || { x: 0, y: 0, zoom: 1 },
          };
          if (isActive) {
            // 检查标记
            CurrentEditWorkflow.set(ensuredBody); // Update the central Echo state
          }
        });
    }

    return () => {
      isActive = false;
    };
  }, [workflow.meta.id]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    CurrentEditWorkflow.set((prev) => {
      // Get current nodes as WorkflowNode array
      const currentNodes = Object.values(prev.nodes || {}) as WorkflowNode[];
      // Apply changes
      const nextNodesArray = applyNodeChanges(changes, currentNodes);
      // Convert back to Record<string, WorkflowNode>
      return {
        nodes: nextNodesArray.reduce(
          (acc, node) => {
            // Ensure the node conforms to WorkflowNode after changes
            // Cast might be necessary if applyNodeChanges loses specific type info,
            // but often preserves the structure. Let's assume it does for now.
            // The key is ensuring the resulting object type matches the state definition.
            acc[node.id] = node as WorkflowNode;
            return acc;
          },
          {} as Record<string, WorkflowNode>,
        ), // Match WorkflowBody.nodes type
      };
    });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    CurrentEditWorkflow.set((prev) => {
      // Get current edges as WorkflowEdge array
      const currentEdges = Object.values(prev.edges || {}) as WorkflowEdge[];
      // Apply changes
      const nextEdgesArray = applyEdgeChanges(changes, currentEdges);
      // Convert back to Record<string, WorkflowEdge>
      return {
        edges: nextEdgesArray.reduce(
          (acc, edge) => {
            // Cast to ensure conformity with WorkflowEdge
            acc[edge.id] = edge as WorkflowEdge;
            return acc;
          },
          {} as Record<string, WorkflowEdge>,
        ), // Match WorkflowBody.edges type
      };
    });
  }, []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      // Validate the type early
      const nodeType = type as NodeType;
      if (!NODE_TYPES[nodeType]) {
        return;
      }

      if (reactFlowWrapper.current) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Create as WorkflowNode directly, including 'name'
        const newNode: WorkflowNode = {
          id: gen.id(),
          type: nodeType, // Assign validated NodeType
          name: NODE_TYPES[nodeType]?.label || `New ${nodeType}`, // Add a default name using label or type
          position: {
            x: position.x,
            y: position.y,
          },
          data: {} as NodeConfig, // Initialize with empty data or default based on type
        };

        CurrentEditWorkflow.set((prev) => ({
          nodes: {
            ...prev.nodes,
            [newNode.id]: newNode, // Add the correctly typed WorkflowNode
          },
        }));
      }
    },
    [screenToFlowPosition],
  );

  const onMoveEnd = useCallback(
    (_: any, viewport: Viewport) => {
      // Only update viewport, preserve existing nodes/edges
      CurrentEditWorkflow.set({
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        },
      });
    },
    [], // No dependency on CurrentEditWorkflow setter itself
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Ensure source and target exist (React Flow guarantees this if connection is valid)
      if (!params.source || !params.target) {
        console.warn("无法创建连接：缺少 source 或 target ID");
        return;
      }

      const sourceHandleId = params.sourceHandle || "";
      const targetHandleId = params.targetHandle || "";

      // Create as WorkflowEdge, spreading EDGE_CONFIG ensures type: "default"
      const newEdge: WorkflowEdge = {
        ...params, // Includes source, target, sourceHandle, targetHandle if they exist
        id: gen.id(),
        source: params.source, // Explicitly set source/target
        target: params.target,
        ...EDGE_CONFIG, // Spread default config first
        type: "default", // Explicitly set type to satisfy WorkflowEdge
        data: {
          type: "default", // data.type might be redundant if EDGE_CONFIG sets top-level type
          sourceHandle: sourceHandleId,
          targetHandle: targetHandleId,
        },
      };

      CurrentEditWorkflow.set((prev) => ({
        edges: {
          ...prev.edges,
          [newEdge.id]: newEdge, // Add the correctly typed WorkflowEdge
        },
      }));
    },
    [], // No external dependencies needed
  );

  const updateNodeData = useCallback(
    <T extends NodeConfig>(
      id: string,
      selector: ((data: T) => Partial<T>) | Partial<T>,
    ) => {
      CurrentEditWorkflow.set((prev) => {
        const targetNode = prev.nodes?.[id] as WorkflowNode<T> | undefined; // Cast to access specific data type T
        if (!targetNode) {
          console.warn(`[updateNodeData] Node with id ${id} not found.`);
          return {}; // Return empty update if node not found
        }

        const updatedData =
          typeof selector === "function"
            ? selector(targetNode.data) // No need to cast data here if targetNode is typed correctly
            : selector;

        // Construct the updated node ensuring it remains a valid WorkflowNode
        const updatedNode: WorkflowNode = {
          ...targetNode,
          data: {
            ...targetNode.data,
            ...updatedData,
          },
        };

        // Return the partial update for the nodes record
        return {
          nodes: {
            ...prev.nodes,
            [id]: updatedNode, // Place the updated WorkflowNode back
          },
        };
      });
    },
    [], // No external dependencies needed
  );

  // Provide nodes/edges/viewport directly from the central state 'body'
  const nodes = Object.values(body.nodes || {});
  const edges = Object.values(body.edges || {});
  const viewport = body.viewport || { x: 0, y: 0, zoom: 1 };

  const value = {
    nodes, // Use derived array
    edges, // Use derived array
    viewport, // Use derived viewport
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
