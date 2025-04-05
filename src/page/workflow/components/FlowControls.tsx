import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import {
  TbArrowsMaximize,
  TbArrowsMinimize,
  TbBolt,
  TbMinus,
  TbPanoramaHorizontal,
  TbPlayerPlay,
  TbPlus,
} from "react-icons/tb";
import { useReactFlow } from "reactflow";

interface CustomControlsProps {
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  showZoom?: boolean;
  showFitView?: boolean;
  showReset?: boolean;
  className?: string;
  onMaximize?: () => void;
  isFullscreen?: boolean;
  onEdit?: () => void;
  onExecute?: () => void;
}

export const FlowControls = ({
  position = "bottom-center",
  showZoom = true,
  showFitView = true,
  className,
  onMaximize,
  isFullscreen,
  onEdit,
  onExecute,
}: CustomControlsProps) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const positionClassName = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-center": "bottom-2 left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-2 right-2",
  };

  const onZoomIn = useCallback(() => {
    zoomIn({ duration: 300 });
  }, [zoomIn]);

  const onZoomOut = useCallback(() => {
    zoomOut({ duration: 300 });
  }, [zoomOut]);

  const onFitView = useCallback(() => {
    fitView({ duration: 500, padding: 0.1 });
  }, [fitView]);

  return (
    <div
      className={cn(
        "absolute z-10 flex bg-background border rounded-full gap-0.5 p-1",
        positionClassName[position],
        className,
      )}
    >
      {showZoom && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onZoomOut}
            title="Zoom Out"
          >
            <TbMinus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onZoomIn}
            title="Zoom In"
          >
            <TbPlus className="h-4 w-4" />
          </Button>
        </>
      )}
      {showFitView && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onFitView}
          title="Fit View"
        >
          <TbPanoramaHorizontal className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onMaximize}
        title="Maximize Window"
      >
        {isFullscreen ? (
          <TbArrowsMinimize className="h-4 w-4" />
        ) : (
          <TbArrowsMaximize className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onEdit}
        title="Trigger Workflow"
      >
        <TbBolt className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onExecute}
        title="Execute Workflow"
      >
        <TbPlayerPlay className="h-4 w-4" />
      </Button>
    </div>
  );
};
