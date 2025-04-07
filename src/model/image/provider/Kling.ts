import { ImageModel } from "../ImageModel";
import { ImageModelManager, ImageModelProvider } from "../ImageModelManager";

export class Kling extends ImageModel {
  constructor(model: string) {
    const api_key = ImageModelManager.getApiKey(KlingProvider.name);
    const configWithDefaults = {
      model,
      api_key,
      post_url: "https://api.kling.ai/v1/generation",
      get_url: "https://api.kling.ai/v1/generation/",
    };
    super(configWithDefaults);
  }
}

const KlingProvider: ImageModelProvider = {
  name: "kling",
  description: "可灵（Kling）图像生成模型",
  icon: "kling-color.svg",
  models: {
    "kling-v1": {
      name: "kling-v1",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description: "可灵 V1 模型",
    },
    "kaiber-v2": {
      name: "kaiber-v2",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description: "可灵 V2 模型",
    },
  },
  create: (model_name: string) => new Kling(model_name),
};

ImageModelManager.registerProvider(KlingProvider);
