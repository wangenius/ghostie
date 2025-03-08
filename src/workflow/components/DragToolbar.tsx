import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TbProgressBolt } from "react-icons/tb";
import { NODE_TYPES, NodeType } from "../types/nodes";

interface DragToolbarProps {
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right"
    | "left"
    | "right";
  className?: string;
}

export const DragToolbar = ({
  position = "left",
  className,
}: DragToolbarProps) => {
  const onDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    nodeType: NodeType,
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";

    // 创建拖拽预览图像
    const dragPreview = document.createElement("div");
    dragPreview.style.position = "fixed";
    dragPreview.style.top = "-1000px";
    dragPreview.style.padding = "8px 12px";
    dragPreview.style.background = "white";
    dragPreview.style.border = "1px solid #e2e8f0";
    dragPreview.style.borderRadius = "6px";
    dragPreview.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    dragPreview.style.fontSize = "14px";
    dragPreview.style.color = "#1a1a1a";
    dragPreview.style.pointerEvents = "none";
    dragPreview.style.zIndex = "9999";
    dragPreview.textContent = NODE_TYPES[nodeType].label;
    document.body.appendChild(dragPreview);

    event.dataTransfer.setDragImage(
      dragPreview,
      dragPreview.offsetWidth / 2,
      dragPreview.offsetHeight / 2,
    );

    requestAnimationFrame(() => {
      document.body.removeChild(dragPreview);
    });
  };

  const positionClassName = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-center": "bottom-2 left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-2 right-2",
    left: "left-2 top-1/2 -translate-y-1/2",
    right: "right-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div
      className={cn(
        "absolute z-10 flex flex-col bg-background border rounded-lg gap-0.5 p-1",
        "transition-transform duration-200 ease-in-out",
        positionClassName[position],
        className,
      )}
    >
      {Object.entries(NODE_TYPES).map(([type, content]) => (
        <Button
          key={type}
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 relative", content.preview && "opacity-80")}
          title={
            content.preview ? `${content.label} (预览功能)` : content.label
          }
          draggable
          onDragStart={(e) => onDragStart(e, type as NodeType)}
        >
          <content.icon className="h-4 w-4" />
          {content.preview && (
            <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-3 h-3 flex items-center justify-center">
              <TbProgressBolt className="h-3 w-3 text-yellow-900" />
            </div>
          )}
        </Button>
      ))}
    </div>
  );
};
