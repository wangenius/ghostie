import { motion } from "framer-motion";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BranchNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const BranchNodeComponent = (props: NodeProps<BranchNodeConfig>) => {
  return (
    <NodePortal
      {...props}
      left={1}
      right={props.data.conditions?.length || 1}
      variant="branch"
      title="分支"
    >
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      ></motion.div>
    </NodePortal>
  );
};

export const BranchNode = memo(BranchNodeComponent);
