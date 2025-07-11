import { ImageModel } from "../ImageModel";
import { ImageModelManager, ImageModelProvider } from "../ImageModelManager";

export class Midjourney extends ImageModel {
  constructor(model: string) {
    const api_key = ImageModelManager.getApiKey(MidjourneyProvider.name);
    const configWithDefaults = {
      model,
      api_key,
      post_url: "https://api.midjourney.com/v1/imagine",
      get_url: "https://api.midjourney.com/v1/imagine/",
    };
    super(configWithDefaults);
  }
}

const MidjourneyProvider: ImageModelProvider = {
  name: "midjourney",
  description: "Midjourney 图像生成模型",
  icon: "midjourney.svg",
  models: {
    v6: {
      name: "v6",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description: "Midjourney V6 模型",
    },
    "v5.2": {
      name: "v5.2",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description: "Midjourney V5.2 模型",
    },
  },
  create: (model_name: string) => new Midjourney(model_name),
};

ImageModelManager.registerProvider(MidjourneyProvider);
