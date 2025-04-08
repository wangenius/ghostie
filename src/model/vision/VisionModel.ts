/** 视觉模型 */
import { AgentModelProps } from "@/agent/types/agent";
import {
  VisionMessage as VisionMessageType,
  VisionModelInfo,
  VisionModelRequestBody,
  VisionModelResponse,
} from "@/model/types/visionModel";
import { ImageManager } from "@/resources/Image";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { VisionMessage } from "./VisionMessage";
import { VisionModelManager } from "./VisionModelManager";

/** 视觉模型, 用于与模型进行交互 */
export class VisionModel {
  /** 模型信息 */
  public info: VisionModelInfo;
  /** 模型用于存储的上下文内容 */
  public Message: VisionMessage = VisionMessage.create();
  /** 当前请求ID */
  protected currentRequestId: string | undefined;
  /** 温度 */
  protected temperature: number = 1;

  /** 构造函数
   * @param config 模型配置
   */
  constructor(config: VisionModelInfo) {
    this.info = config;
  }

  /** 创建模型
   * @param modelwithprovider 模型名称 openai:gpt-4-vision-preview
   * @returns 模型实例
   */
  static create(model?: AgentModelProps) {
    if (model?.provider) {
      return VisionModelManager.get(model.provider).create(model.name);
    }
    return new VisionModel({
      api_key: "",
      api_url: "",
      model: "",
    });
  }

  /** 设置温度
   * @param temperature 温度
   * @returns 当前实例
   */
  setTemperature(temperature: number): this {
    this.temperature = temperature;
    return this;
  }

  /**
   * 准备请求体，允许子类重写以添加特定参数
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: VisionModelRequestBody,
  ): VisionModelRequestBody {
    return body;
  }

  /**
   * 解析响应体，处理不同提供商的响应格式差异
   * @param payload 原始响应数据字符串
   * @returns 解析后的内容
   */
  protected parseResponseBody(payload: string): {
    completion?: string;
    reasoner?: string;
  } {
    try {
      const data = JSON.parse(payload.replace("data: ", ""));
      const delta = data.choices?.[0]?.delta;
      const completion = delta?.content;
      return { completion };
    } catch (error) {
      return {};
    }
  }

  public async execute(image: string, query: string): Promise<string> {
    this.Message.setSystem(
      `你是一个专业的视觉模型，请根据用户的问题和图片内容，给出详细的回答。`,
    );
    const imagebase64 = await ImageManager.getImageBody(image);
    this.Message.push([
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imagebase64,
            },
          },
          {
            type: "text",
            text: query,
          },
        ],
      },
    ]);
    const response = await this.stream();
    return response.content;
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

      // 监听流式响应事件
      const unlistenStream = await cmd.listen(
        `chat-stream-${this.currentRequestId}`,
        (event) => {
          if (!event.payload) return;
          /* 适配子类不同的相应格式 */
          const { completion } = this.parseResponseBody(event.payload);

          /* 如果返回的是正文 */
          if (completion) {
            completionContent += completion;
            this.Message.updateLastMessage({
              content: completionContent,
            });
          }
        },
      );

      // 监听错误事件
      const unlistenError = await cmd.listen(
        `chat-stream-error-${this.currentRequestId}`,
        (event) => {
          this.Message.updateLastMessage({
            error: `请求失败: ${event.payload}`,
          });
          throw new Error(event.payload);
        },
      );

      // 发起流式请求
      await cmd.invoke("chat_stream", {
        model: this.info.model,
        apiUrl: this.info.api_url,
        apiKey: this.info.api_key,
        requestId: this.currentRequestId,
        requestBody,
      });

      // 清理事件监听器
      unlistenStream();
      unlistenError();

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

  /** 停止当前请求 */
  public async stop(): Promise<void> {
    if (this.currentRequestId) {
      await cmd.invoke("cancel_stream", { requestId: this.currentRequestId });
      this.currentRequestId = undefined;
    }
  }
}
