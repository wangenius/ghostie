import { motion } from "framer-motion";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { IteratorNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const IteratorNodeComponent = (props: NodeProps<IteratorNodeConfig>) => {
  return (
    <NodePortal {...props} left={1} right={1} variant="iterator" title="迭代器">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      ></motion.div>
    </NodePortal>
  );
};

export const IteratorNode = memo(IteratorNodeComponent);
