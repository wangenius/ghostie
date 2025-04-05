import { memo, useEffect, useRef } from "react";
import ReactFlow, { Background, SelectionMode, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import { DragToolbar } from "./DragToolbar";
import { FlowControls } from "./FlowControls";
import { useFlow } from "../context/FlowContext";
import { edgeTypes, nodeTypes } from "../types/nodes";

export const WorkflowGraph = memo(() => {
  const {
    onDragOver,
    onDrop,
    reactFlowWrapper,
    onMoveEnd,
    onNodesChange,
    nodes,
    onEdgesChange,
    onConnect,
    edges,
    viewport,
  } = useFlow();

  const reactFlowInstance = useReactFlow();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      // 初始加载时应用动画
      reactFlowInstance.setViewport(
        { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
        { duration: 300 },
      );
      isInitialMount.current = false;
    } else {
      // 后续更新时不使用动画，避免与缩放操作冲突
      reactFlowInstance.setViewport(
        { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
        { duration: 0 },
      );
    }
  }, [viewport, reactFlowInstance]);

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative rounded-lg border focus-within:border-primary/40 overflow-hidden"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        maxZoom={10}
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        onMoveEnd={onMoveEnd}
        className="w-full h-full bg-background"
        elementsSelectable
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Control", "Meta"]}
        panActivationKeyCode="Space"
        elevateNodesOnSelect={true}
        defaultEdgeOptions={{
          type: "default",
          animated: false,
        }}
        autoPanOnConnect={true}
        proOptions={{ hideAttribution: true }}
        nodeOrigin={[0.5, 0.5]}
        fitViewOptions={{ padding: 0.2 }}
        autoPanOnNodeDrag={true}
        selectionOnDrag={true}
        connectOnClick
      >
        <Background gap={25} />
        <FlowControls position="bottom-center" showZoom showFitView showReset />
        <DragToolbar position="left" />
      </ReactFlow>
    </div>
  );
});
