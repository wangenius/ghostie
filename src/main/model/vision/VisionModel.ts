/** 视觉模型 */
import { ModelItem } from "@/agent/types/agent";
import {
  VisionMessage as VisionMessageType,
  VisionModelInfo,
  VisionModelRequestBody,
  VisionModelResponse,
} from "src/common/types/visionModel";
import { ImageManager } from "@/resources/Image";
import { gen } from "@/utils/generator";
import { VisionMessage } from "./VisionMessage";
import { VisionModelManager } from "./VisionModelManager";
import { HttpStreamHandler } from "@/utils/http-stream";

/** 视觉模型, 用于与模型进行交互 */
export class VisionModel {
  /** 模型配置 */
  protected info: { model: string; api_key: string; api_url: string };
  /** 消息管理器 */
  protected Message: VisionMessage;
  /** 当前请求ID */
  protected currentRequestId?: string;
  /** 温度 */
  protected temperature: number = 0.7;
  /** HTTP流处理器 */
  private httpHandler: HttpStreamHandler;

  /** 构造函数 */
  constructor(config: { model: string; api_key: string; api_url: string }) {
    this.info = config;
    this.Message = VisionMessage.create();
    this.httpHandler = new HttpStreamHandler();
  }

  /** 创建模型实例 */
  static create(config?: { model: string; api_key: string; api_url: string }): VisionModel {
    if (!config) {
      throw new Error("模型配置不能为空");
    }
    return new VisionModel(config);
  }

  /** 设置API密钥 */
  setApiKey(apiKey: string): this {
    this.info.api_key = apiKey;
    return this;
  }

  /** 设置API URL */
  setApiUrl(apiUrl: string): this {
    this.info.api_url = apiUrl;
    return this;
  }

  /** 设置温度 */
  setTemperature(temperature: number): this {
    this.temperature = temperature;
    return this;
  }

  /** 获取模型信息 */
  getInfo() {
    return this.info;
  }

  /** 停止当前请求 */
  async stop(): Promise<void> {
    if (this.currentRequestId) {
      this.httpHandler.abort();
      this.currentRequestId = undefined;
    }
  }

  /**
   * 适配不同提供商的请求体格式
   * 子类可以重写此方法来适配特定的API格式
   */
  protected prepareRequestBody(body: VisionModelRequestBody): VisionModelRequestBody {
    return body;
  }

  /**
   * 适配不同提供商的响应体格式
   * 子类可以重写此方法来解析特定的响应格式
   */
  protected parseResponseBody(payload: string): { completion?: string } {
    try {
      const data = JSON.parse(payload);
      
      // 标准 OpenAI 视觉格式
      if (data.choices && data.choices[0]) {
        const choice = data.choices[0];
        return {
          completion: choice.delta?.content || choice.message?.content || "",
        };
      }
      
      return {};
    } catch (error) {
      console.error("解析视觉响应失败:", error);
      return {};
    }
  }

  /** 执行视觉分析
   * @param imageUrl 图像URL或base64
   * @param query 查询内容
   * @returns 分析结果
   */
  public async execute(imageUrl: string, query: string): Promise<string> {
    this.Message.push([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: query,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ]);

    const result = await this.stream();
    return result.content;
  }

  /** 流式请求
   * @returns 响应生成器
   */
  public async stream(): Promise<VisionModelResponse<string>> {
    // 如果有正在进行的请求，先停止它
    if (this.currentRequestId) {
      await this.stop();
    }

    /* 生成请求ID */
    this.currentRequestId = gen.id();
    /* 内容 */
    let completionContent = "";

    /* 消息 */
    let messages: VisionMessageType[] = this.Message.listWithOutType();

    try {
      /* 创建请求体 */
      let requestBody: VisionModelRequestBody = {
        model: this.info.model,
        messages,
        stream: true,
        temperature: this.temperature,
      };

      this.Message.push([
        {
          role: "assistant",
          loading: true,
          content: "",
        },
      ]);

      /* 适配子类请求体 */
      requestBody = this.prepareRequestBody(requestBody);

      console.log(requestBody);

      // 发起流式请求
      await this.httpHandler.streamRequest(
        this.info.api_url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.info.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        (chunk: string) => {
          /* 适配子类不同的响应格式 */
          const { completion } = this.parseResponseBody(chunk);

          /* 如果返回的是正文 */
          if (completion) {
            completionContent += completion;
            this.Message.updateLastMessage({
              content: completionContent,
            });
          }
        },
        (error: Error) => {
          this.Message.updateLastMessage({
            error: `请求失败: ${error.message}`,
          });
          throw error;
        }
      );

      this.Message.updateLastMessage({
        loading: false,
      });

      return {
        content: completionContent,
        stop: () => this.stop(),
      };
    } catch (error) {
      this.currentRequestId = undefined;

      return {
        content: String(error),
        error: error instanceof Error ? error.message : "Unknown error",
        stop: () => this.stop(),
      };
    }
  }
}
