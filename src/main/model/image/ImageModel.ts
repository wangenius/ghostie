import { ModelItem } from "@/agent/types/agent";
import {
  ImageModelGetResponse,
  ImageModelGetResultError,
  ImageModelInfo,
  ImageModelRequestBody,
  ImageModelRequestResponse,
  ImageModelRequestResponseError,
} from "src/common/types/imageModel";
import { gen } from "@/utils/generator";
import { HttpStreamHandler } from "@/utils/http-stream";
import { ImageModelManager } from "./ImageModelManager";

/** 图像生成模型, 用于与模型进行交互 */
export class ImageModel {
  /** 模型信息 */
  public info: ImageModelInfo;
  /** 任务ID */
  protected task_id: string | undefined;
  /** HTTP处理器 */
  private httpHandler: HttpStreamHandler;

  /** 构造函数
   * @param config 模型配置
   * @param props 模型属性
   */
  constructor(config: ImageModelInfo) {
    this.info = config;
    this.httpHandler = new HttpStreamHandler();
  }

  /** 创建模型
   * @param modelwithprovider 模型名称 openai:dall-e-3
   * @returns 模型实例
   */
  static create(model?: ModelItem) {
    if (model?.provider) {
      const provider = ImageModelManager.get(model.provider);
      if (!provider) {
        throw new Error(`Provider ${model.provider} not found`);
      }
      const modelProps = provider.models[model.name];
      if (!modelProps) {
        throw new Error(
          `Model ${model.name} not found in provider ${model.provider}`,
        );
      }
      return provider.create(model.name);
    }
    return new ImageModel({
      api_key: "",
      post_url: "",
      model: "",
      get_url: "",
    });
  }

  /**
   * 准备请求体，允许子类重写以添加特定参数
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ImageModelRequestBody,
  ): ImageModelRequestBody {
    // 默认实现直接返回原始请求体
    return body;
  }

  /**
   * 解析响应体，处理不同提供商的响应格式差异
   * @param payload 原始响应数据字符串
   * @returns 解析后的内容
   */
  protected parseResponseBody(payload: string): {
    completion?: string;
    images?: string[];
  } {
    try {
      // 默认OpenAI格式解析
      const data = JSON.parse(payload.replace("data: ", ""));
      const delta = data.choices?.[0]?.delta;
      // 提取内容
      const completion = delta?.content;
      // 提取图像
      const images = delta?.images;
      return { completion, images };
    } catch (error) {
      return {};
    }
  }

  /** 流式请求
   * @param n 生成数量
   * @param size 图像大小
   * @param quality 图像质量
   * @param style 图像风格
   * @returns 响应生成器
   */
  public async generate(
    prompt: string,
    negative_prompt?: string,
    body?: ImageModelRequestBody["parameters"],
  ): Promise<ImageModelRequestResponse | ImageModelRequestResponseError> {
    /* 创建请求体 */
    let requestBody: ImageModelRequestBody = {
      model: this.info.model,
      input: {
        prompt,
        negative_prompt,
      },
      parameters: body || {},
    };

    /* 适配子类请求体 */
    requestBody = this.prepareRequestBody(requestBody);

    console.log(requestBody);

    try {
      // 发起HTTP请求
      const response = await this.httpHandler.request(
        this.info.post_url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.info.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      return response as ImageModelRequestResponse;
    } catch (error) {
      console.error("图像生成失败:", error);
      return {
        message: error instanceof Error ? error.message : String(error),
      } as ImageModelRequestResponseError;
    }
  }

  /** 获取任务ID */
  public getTaskId(): string | undefined {
    return this.task_id;
  }

  public setTaskId(task_id: string): void {
    this.task_id = task_id;
  }

  public async getResult(): Promise<
    ImageModelGetResultError | ImageModelGetResponse
  > {
    const response = await this.httpHandler.request(
      this.info.get_url + this.task_id,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.info.api_key}`,
        },
      }
    );

    if (response.output.task_status === "FAILED") {
      return response as ImageModelGetResultError;
    }

    return response as ImageModelGetResponse;
  }
}
