import { AgentModelProps } from "@/agent/types/agent";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageModel } from "@/model/image/ImageModel";
import { ImageModelManager } from "@/model/image/ImageModelManager";
import { ImageManager, ImagesStore } from "@/resources/Image";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { NodeExecutor } from "../../../workflow/execute/NodeExecutor";
import { useFlow } from "../context/FlowContext";
import { ImageNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { CurrentWorkflow } from "@/workflow/Workflow";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TbMaximize } from "react-icons/tb";
import { ImageView } from "@/page/main/ImageView";

const ImageNodeComponet = (props: NodeProps<ImageNodeConfig>) => {
  const [prompt, setPrompt] = useState(props.data.prompt);
  const [negative_prompt, setNegativePrompt] = useState(
    props.data.negative_prompt,
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { updateNodeData } = useFlow();
  const workflow = CurrentWorkflow.use();
  const workflowState = workflow.executor.use((selector) => selector[props.id]);
  const images = ImagesStore.use();

  const handleModelChange = useCallback(
    (model: AgentModelProps) => {
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
        items={Object.values(ImageModelManager.getProviders()).flatMap(
          (provider) => {
            const key = ImageModelManager.getApiKey(provider.name);
            if (!key) return [];
            const models = provider.models;
            return Object.values(models).map((model) => {
              return {
                label: model.name,
                value: {
                  provider: provider.name,
                  name: model.name,
                },
                type: provider.name,
                description: `${model.description}`,
              };
            });
          },
        )}
        onSelect={(value) => handleModelChange(value[0])}
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
export class ImageNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });

      const imageConfig = this.node.data as ImageNodeConfig;
      if (!imageConfig.model) {
        throw new Error("Image model not configured");
      }

      const parsedPrompt = this.parseTextFromInputs(
        imageConfig.prompt || "",
        inputs,
      );
      const parsedNegativePrompt = this.parseTextFromInputs(
        imageConfig.negative_prompt || "",
        inputs,
      );

      const model = ImageModel.create(imageConfig.model);
      const res = await model.generate(parsedPrompt, parsedNegativePrompt);

      if (!("output" in res)) {
        throw new Error(res.message);
      }

      await ImageManager.setImage(res.output.task_id, "", "image/png");
      await ImageManager.setImageTaskId(res.output.task_id, res.output.task_id);

      model.setTaskId(res.output.task_id);

      while (true) {
        const result = await model.getResult();
        if (
          result.output.task_status === "SUCCEEDED" &&
          "results" in result.output &&
          result.output.results[0]?.base64
        ) {
          const base64Image = result.output.results[0].base64;
          await ImageManager.setImage(
            res.output.task_id,
            base64Image,
            "image/png",
          );

          this.updateNodeState({
            status: "completed",
            outputs: {
              result: res.output.task_id,
            },
          });
          break;
        } else if (result.output.task_status === "FAILED") {
          this.updateNodeState({
            status: "failed",
            error: "图片生成失败",
          });
          break;
        }
        // 等待3秒后再次检查
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      return {
        success: true,
        data: {
          result: res.output.task_id,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("image", ImageNodeExecutor);
