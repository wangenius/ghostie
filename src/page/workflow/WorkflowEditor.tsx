import { LoadingSpin } from "@/components/custom/LoadingSpin";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Suspense, useCallback, useState } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { FlowProvider } from "./context/FlowContext";
import { WorkflowGraph } from "./components/WorkflowGraph";
import { WorkflowInfo } from "./WorkflowInfo";

/* 工作流编辑器内容 */
export const WorkflowEditor = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <Suspense fallback={<LoadingSpin />}>
      <ReactFlowProvider>
        <FlowProvider>
          <motion.div
            layout
            className={cn("flex flex-col overflow-hidden", {
              "fixed inset-0 top-12 z-50 bg-background": isFullscreen,
              "relative w-full h-full": !isFullscreen,
            })}
            initial={false}
            animate={{
              scale: isFullscreen ? 1 : 1,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            <motion.div
              layout
              className={cn("", {
                "px-4 py-2": isFullscreen,
                "p-0": !isFullscreen,
              })}
            >
              <WorkflowInfo />
            </motion.div>
            <motion.div
              layout
              className={cn("flex-1 min-h-0", {
                "p-4 pt-0": isFullscreen,
                "p-0 pt-2": !isFullscreen,
              })}
            >
              <WorkflowGraph
                handleToggleFullscreen={handleToggleFullscreen}
                isFullscreen={isFullscreen}
              />
            </motion.div>
          </motion.div>
        </FlowProvider>
      </ReactFlowProvider>
    </Suspense>
  );
};
