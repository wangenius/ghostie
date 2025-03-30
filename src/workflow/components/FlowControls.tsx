import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import {
  TbArrowsMaximize,
  TbMinus,
  TbPlus,
  TbWindowMaximize,
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
  showMaximize?: boolean;
  className?: string;
}

export const FlowControls = ({
  position = "bottom-center",
  showZoom = true,
  showMaximize = false,
  showFitView = true,
  className,
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

  const onMaximize = useCallback(() => {}, []);

  return (
    <div
      className={cn(
        "absolute z-10 flex bg-background border rounded-lg gap-0.5 p-1",
        positionClassName[position],
        className,
      )}
    >
      {showZoom && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomOut}
            title="Zoom Out"
          >
            <TbMinus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
          className="h-8 w-8"
          onClick={onFitView}
          title="Fit View"
        >
          <TbArrowsMaximize className="h-4 w-4" />
        </Button>
      )}
      {showMaximize && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onMaximize}
          title="Maximize Window"
        >
          <TbWindowMaximize className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
