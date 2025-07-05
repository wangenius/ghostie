import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

let currentRoot: any = null;

interface ContextMenuPortalProp {
  content: ReactNode;
  position: { x: number; y: number };
  onClose: () => void;
}

interface ContextProps {
  content: ReactNode | ((close: () => void) => ReactNode);
  event: MouseEvent | TouchEvent | any;
  position?: "cursor" | "top";
  x?: number;
  y?: number;
  afterClose?: () => void;
  beforeOpen?: () => void;
}

const ContextMenuPortal = ({
  content,
  position,
  onClose,
}: ContextMenuPortalProp) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleGlobalClick);

    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
    };
  }, []);

  return createPortal(
    <AnimatePresence mode="wait" onExitComplete={onClose}>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 400,
            mass: 0.5,
          }}
          style={{
            position: "fixed",
            top: position.y,
            left: position.x,
            zIndex: 50,
          }}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 shadow-none"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/**   创建一个上下文菜单，可以用于右键菜单、气泡菜单等*/
export const context = ({
  content,
  event,
  position = "cursor",
  x = 0,
  y = 0,
  afterClose,
  beforeOpen,
}: ContextProps) => {
  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }

  event.preventDefault();
  const menuX = position === "cursor" ? (event as MouseEvent).clientX : x;
  const menuY = position === "cursor" ? (event as MouseEvent).clientY : y;
  const menuContainer = document.createElement("div");
  document.body.appendChild(menuContainer);
  const root = createRoot(menuContainer);

  const closeMenu = () => {
    root.unmount();
    document.body.removeChild(menuContainer);
    afterClose?.();
    currentRoot = null;
  };
  beforeOpen?.();

  root.render(
    <ContextMenuPortal
      content={typeof content === "function" ? content(closeMenu) : content}
      position={{ x: menuX, y: menuY }}
      onClose={closeMenu}
    />,
  );

  currentRoot = root;

  return closeMenu;
};
