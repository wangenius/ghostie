import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageView } from "@/page/main/ImageView";
import { memo, useCallback, useState } from "react";
import { TbMaximize } from "react-icons/tb";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { ImageNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const ImageNodeComponet = (props: NodeProps<ImageNodeConfig>) => {
  const [prompt, setPrompt] = useState(props.data.prompt);
  const [negative_prompt, setNegativePrompt] = useState(
    props.data.negative_prompt,
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { updateNodeData } = useFlow();
  const workflow = {
    executor: {
      [props.id]: {
        status: "completed",
        outputs: {
          result: "1",
        },
      },
    },
  };
  const workflowState = {
    status: "completed",
    outputs: {
      result: "1",
    },
  };
  const images = {};

  const handleModelChange = useCallback(
    (model: any) => {
      updateNodeData<ImageNodeConfig>(props.id, {
        model: model,
      });
    },
    [updateNodeData, props.id],
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setPrompt(newValue);
      updateNodeData<ImageNodeConfig>(props.id, { prompt: newValue });
    },
    [updateNodeData, props.id],
  );

  const handleNegativePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setNegativePrompt(newValue);
      updateNodeData<ImageNodeConfig>(props.id, { negative_prompt: newValue });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal {...props} left={1} right={1} variant="image" title="Image">
      <DrawerSelector
        panelTitle="Select Model"
        value={[props.data.model]}
        items={[]}
        onSelect={() => {}}
      />

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600">Prompt</Label>
        <Textarea
          variant="dust"
          className="text-xs min-h-[80px] transition-colors resize-none p-2"
          value={prompt}
          data-id={`${props.id}-prompt`}
          onChange={handlePromptChange}
          placeholder="Enter prompt, you can copy input parameters from other nodes..."
        />

        <Label className="text-xs font-medium text-gray-600 mt-3">
          Negative Prompt
        </Label>
        <Textarea
          variant="dust"
          className="text-xs min-h-[80px] transition-colors resize-none p-2"
          value={negative_prompt}
          onChange={handleNegativePromptChange}
          placeholder="Enter negative prompt, you can copy input parameters from other nodes..."
        />
        {workflowState?.status === "completed" && (
          <div className="flex flex-wrap justify-center gap-2">
            <div
              key={workflowState.outputs.result}
              className="relative group/image w-[300px] aspect-square rounded-lg overflow-hidden bg-muted"
              onClick={() => setSelectedImage(workflowState.outputs.result)}
            >
              <img
                src={`${images[workflowState.outputs.result].base64Image}`}
                alt="生成的图片"
                className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                <TbMaximize className="w-6 h-6 text-white" />
              </div>
            </div>
            <ImageView
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
            />
          </div>
        )}
      </div>
    </NodePortal>
  );
};

export const ImageNode = memo(ImageNodeComponet);