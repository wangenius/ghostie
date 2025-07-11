import { ModelProvider } from "@/model/types/model";
import { EmbeddingModel, EmbeddingModelRequestBody } from "../EmbeddingModel";
import {
  EmbeddingModelManager,
  EmbeddingModelProps,
} from "../EmbeddingModelManger";
import { ModelKey } from "@/model/key/ModelKey";
export class TongyiEmbedding extends EmbeddingModel {
  constructor(model: string) {
    const api_key = ModelKey.get(TongyiProvider.name);
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合通义规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: EmbeddingModelRequestBody,
  ): EmbeddingModelRequestBody {
    const tongyiBody = { ...body };
    return tongyiBody;
  }
}

// 注册通义提供商
const TongyiProvider: ModelProvider<EmbeddingModelProps, TongyiEmbedding> = {
  name: "tongyi-embedding",
  description: "阿里通义千问",
  icon: "qwen-color.svg",
  models: {
    "text-embedding-v3": {
      name: "text-embedding-v3",
      description: "通义千问-Max长上下文 - 支持超大上下文的高性能模型",
    },
  },
  create: (model_name: string) => new TongyiEmbedding(model_name),
};

// 注册到EmbeddingModelManager
EmbeddingModelManager.registerProvider(TongyiProvider);
