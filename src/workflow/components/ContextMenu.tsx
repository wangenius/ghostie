import { Menu } from "@/components/ui/menu";
import { AnimatePresence, motion } from "framer-motion";
import { NODE_TYPES } from "../constants";
import { NodeType } from "../types/nodes";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelect: (type: NodeType) => void;
}

export const ContextMenu = ({ x, y, onClose, onSelect }: ContextMenuProps) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="menu"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        className="fixed z-50 min-w-[160px] flex flex-col gap-1"
        style={{
          top: y,
          left: x,
          transformOrigin: "top left",
        }}
      >
        <Menu
          items={Object.entries(NODE_TYPES)
            .filter(([type]) => type !== "start" && type !== "end")
            .map(([type, content]) => ({
              label: content.label,
              icon: content.icon,
              onClick: () => {
                onSelect(type as NodeType);
                onClose();
              },
            }))}
        />
      </motion.div>
    </AnimatePresence>
  );
};
