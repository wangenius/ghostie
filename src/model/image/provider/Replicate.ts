import { ImageModel } from "../ImageModel";
import { ImageModelManager, ImageModelProvider } from "../ImageModelManager";

export class ReplicateAI extends ImageModel {
  constructor(model: string) {
    const api_key = ImageModelManager.getApiKey(ReplicateProvider.name);
    const configWithDefaults = {
      model,
      api_key,
      post_url: "https://api.stability.ai/v1/generation",
      get_url: "https://api.stability.ai/v1/generation/",
    };
    super(configWithDefaults);
  }
}

const ReplicateProvider: ImageModelProvider = {
  name: "replicate",
  description: "Replicate 图像生成模型",
  icon: "replicate.svg",
  models: {
    "stable-diffusion-xl": {
      name: "stable-diffusion-xl",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard"],
      styles: ["natural", "anime", "photographic"],
      maxN: 4,
      contextWindow: 1000,
      description: "Stability AI SDXL 模型",
    },
    "stable-diffusion-v2": {
      name: "stable-diffusion-v2",
      supportStream: false,
      sizes: ["512x512", "768x768"],
      qualities: ["standard"],
      styles: ["natural", "anime", "photographic"],
      maxN: 4,
      contextWindow: 1000,
      description: "Stability AI SD v2 模型",
    },
  },
  create: (model_name: string) => new ReplicateAI(model_name),
};

ImageModelManager.registerProvider(ReplicateProvider);
