import React, { ReactNode, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TbCheck, TbX } from "react-icons/tb";
import { AnimatePresence, motion } from "framer-motion";

interface DialogOptions {
  title?: string;
  description?: string;
  content: ReactNode | ((close: () => void) => ReactNode);
  footer?: ReactNode | ((close: () => void) => ReactNode);
  onClose?: () => void;
  closeIconHide?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  autoFocus?: boolean;
  transparent?: boolean;
  [key: string]: any;
}

type CloseDialog = () => void;

/** 创建一个对话框，可以用于弹窗、提示框等*/
export function dialog({
  title,
  description,
  content,
  footer,
  onClose,
  className,
  closeIconHide,
  autoFocus = true,
  transparent = false,
  ...props
}: DialogOptions): CloseDialog {
  if (typeof window !== "undefined" && window.event) {
    window.event.stopPropagation?.();
  }

  const dialogRoot = document.createElement("div");
  document.body.appendChild(dialogRoot);
  const root = ReactDOM.createRoot(dialogRoot);

  const DialogPortal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(true);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (autoFocus && dialogRef.current) {
        dialogRef.current.focus();
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      };

      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.removeChild(dialogRoot);
      };
    }, []);

    const handleClose = () => {
      setIsOpen(false);
    };

    const handleAnimationComplete = () => {
      if (!isOpen) {
        root.unmount();
        if (onClose) onClose();
      }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    };

    return createPortal(
      <AnimatePresence mode="wait" onExitComplete={handleAnimationComplete}>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleBackdropClick}
            />
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 400,
                mass: 0.5,
              }}
              onAnimationComplete={() => {
                if (props.onAnimationComplete) {
                  props.onAnimationComplete();
                }
                // 动画完成后，自动聚焦第一个输入框
                const input = dialogRef.current?.querySelector("input");
                if (input instanceof HTMLInputElement) {
                  input.focus();
                }
              }}
              className={cn(
                "relative z-50 max-h-[85vh] max-w-[80vw] rounded-3xl bg-background p-5 w-[800px] flex flex-col gap-2",
                className,
                transparent && "bg-transparent backdrop-blur-none !shadow-none",
              )}
              {...props}
            >
              {(title || !closeIconHide) && (
                <div className="flex items-center justify-between mb-3 flex-none pl-3 select-none">
                  {title && (
                    <div>
                      <h2 className="font-semibold">{title}</h2>
                      {description && (
                        <p className="text-sm text-gray-500">{description}</p>
                      )}
                    </div>
                  )}
                  {!closeIconHide && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="hover:bg-muted"
                    >
                      <TbX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-hidden"
              >
                {typeof content === "function" ? content(handleClose) : content}
              </motion.div>

              {footer &&
                (typeof footer === "function" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-none mt-4"
                  >
                    {footer(handleClose)}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-none mt-4"
                  >
                    {footer}
                  </motion.div>
                ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body,
    );
  };

  root.render(<DialogPortal />);

  return () => {
    const dialogElement = dialogRoot.firstElementChild;
    if (dialogElement) {
      const closeEvent = new Event("close");
      dialogElement.dispatchEvent(closeEvent);
    }
  };
}

dialog.confirm = ({
  title = "Confirm",
  content,
  onOk,
  variants = "default",
  okText = "Confirm",
  cancelText = "Cancel",
  onCancel,
}: {
  title?: string;
  content?: ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  variants?:
    | "link"
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | null;
}) => {
  return dialog({
    className: "md:max-w-[480px]",
    title,
    content: <div className="px-3">{content}</div>,
    closeIconHide: true,
    footer: (close) => {
      return (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs flex-none"
            onClick={() => {
              close();
              onCancel?.();
            }}
          >
            <TbX className="w-4 h-4" />
            {cancelText}
          </Button>
          <Button
            variant={variants}
            className="h-8 px-3 text-xs flex-none relative"
            onClick={() => {
              close();
              onOk?.();
            }}
          >
            <TbCheck className="w-4 h-4" />
            {okText}
          </Button>
        </div>
      );
    },
  });
};
