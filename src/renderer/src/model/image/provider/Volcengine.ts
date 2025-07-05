import { ImageModel } from "../ImageModel";
import { ImageModelManager, ImageModelProvider } from "../ImageModelManager";

export class Volcengine extends ImageModel {
  constructor(model: string) {
    const api_key = ImageModelManager.getApiKey(VolcengineProvider.name);
    const configWithDefaults = {
      model,
      api_key,
      post_url: "https://open.volcengineapi.com/v1/image/generation",
      get_url: "https://open.volcengineapi.com/v1/image/generation/",
    };
    super(configWithDefaults);
  }
}

const VolcengineProvider: ImageModelProvider = {
  name: "volcengine",
  description: "字节跳动火山引擎图像生成模型",
  icon: "doubao-color.svg",
  models: {
    "skylark-v1": {
      name: "skylark-v1",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description: "火山引擎 Skylark V1 模型",
    },
    "skylark-v2": {
      name: "skylark-v2",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description: "火山引擎 Skylark V2 模型",
    },
  },
  create: (model_name: string) => new Volcengine(model_name),
};

ImageModelManager.registerProvider(VolcengineProvider);
