import { ImageModelRequestBody } from "@/model/types/imageModel";
import { ImageModel } from "../ImageModel";
import { ImageModelManager, ImageModelProvider } from "../ImageModelManager";

export class Tongyi extends ImageModel {
  constructor(model: string) {
    const api_key = ImageModelManager.getApiKey(TongyiProvider.name);
    const configWithDefaults = {
      model,
      api_key,
      post_url:
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
      get_url: "https://dashscope.aliyuncs.com/api/v1/tasks/",
    };
    super(configWithDefaults);
  }

  protected prepareRequestBody(
    body: ImageModelRequestBody,
  ): ImageModelRequestBody {
    return {
      ...body,
    };
  }

  protected parseResponseBody(payload: string): {
    completion?: string;
    images?: string[];
  } {
    try {
      const data = JSON.parse(payload);
      const images = data.output?.images;
      return { images };
    } catch (error) {
      return {};
    }
  }
}

const TongyiProvider: ImageModelProvider = {
  name: "tongyi",
  description: "阿里云通义万相图像生成模型",
  icon: "qwen-color.svg",
  models: {
    "wanx2.1-t2i-plus": {
      name: "wanx2.1-t2i-plus",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description:
        "全面升级版本。生成图像细节更丰富，速度稍慢。对应通义万相官网2.1专业模型。",
    },
    "wanx2.1-t2i-turbo": {
      name: "wanx2.1-t2i-turbo",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description:
        "全面升级版本。生成速度快、效果全面、综合性价比高。对应通义万相官网2.1极速模型。",
    },
    "wanx2.0-t2i-turbo": {
      name: "wanx2.0-t2i-turbo",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description:
        "全面升级版本。生成速度快、效果全面、综合性价比高。对应通义万相官网2.1极速模型。",
    },
    "wanx-v1": {
      name: "wanx-v1",
      supportStream: false,
      sizes: ["1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "anime", "photographic", "artistic"],
      maxN: 4,
      contextWindow: 1000,
      description:
        "全面升级版本。生成速度快、效果全面、综合性价比高。对应通义万相官网2.1极速模型。",
    },
  },
  create: (model_name: string) => new Tongyi(model_name),
};

ImageModelManager.registerProvider(TongyiProvider);
