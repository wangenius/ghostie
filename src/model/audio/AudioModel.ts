import { ModelItem } from "@/agent/types/agent";
import {
  AudioModelInfo,
  AudioModelRequestBody,
  AudioModelResponse,
} from "@/model/types/audioModel";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { AudioModelManager, AudioModelProps } from "./AudioModelManager";
import { AudioMessage } from "./AudioMessage";

/** 音频模型, 用于与模型进行交互 */
export class AudioModel {
  /** 模型信息 */
  public info: AudioModelInfo;
  /** 模型用于存储的上下文内容 */
  public Message: AudioMessage = AudioMessage.create();
  /** 当前请求ID */
  protected currentRequestId: string | undefined;
  /** 温度 */
  protected temperature: number = 1;
  /** 模型属性 */
  protected props: AudioModelProps;

  /** 构造函数
   * @param config 模型配置
   * @param props 模型属性
   */
  constructor(config: AudioModelInfo, props: AudioModelProps) {
    this.info = config;
    this.props = props;
  }

  /** 创建模型
   * @param modelwithprovider 模型名称 openai:tts-1
   * @returns 模型实例
   */
  static create(model?: ModelItem) {
    if (model?.provider) {
      const provider = AudioModelManager.get(model.provider);
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
    return new AudioModel(
      {
        api_key: "",
        api_url: "",
        model: "",
      },
      {
        name: "",
        supportStream: false,
        voices: [],
        speedRange: [0, 0],
        contextWindow: 0,
        description: "",
      },
    );
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
    body: AudioModelRequestBody,
  ): AudioModelRequestBody {
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
  } {
    try {
      // 默认OpenAI格式解析
      const data = JSON.parse(payload.replace("data: ", ""));
      const delta = data.choices?.[0]?.delta;
      // 提取内容
      const completion = delta?.content;
      return { completion };
    } catch (error) {
      return {};
    }
  }

  /** 生成音频
   * @param text 文本内容
   * @param voice 声音类型
   * @param speed 语速
   * @returns 音频内容
   */
  public async generate(
    text: string,
    voice?: string,
    speed?: number,
  ): Promise<string> {
    // 验证参数
    if (voice && !this.props.voices.includes(voice)) {
      throw new Error(
        `Voice ${voice} not supported by model ${this.props.name}`,
      );
    }
    if (speed) {
      const [min, max] = this.props.speedRange;
      if (speed < min || speed > max) {
        throw new Error(`Speed must be between ${min} and ${max}`);
      }
    }

    this.Message.setSystem(
      `你是一个专业的语音合成模型，请根据用户的要求生成相应的音频。`,
    );
    this.Message.push([
      {
        role: "user",
        content: text,
        created_at: Date.now(),
      },
    ]);

    const response = await this.stream(voice, speed);
    return response.content;
  }

  /** 流式请求
   * @param voice 声音类型
   * @param speed 语速
   * @returns 响应生成器
   */
  public async stream(
    voice?: string,
    speed?: number,
  ): Promise<AudioModelResponse<string>> {
    // 如果有正在进行的请求，先停止它
    if (this.currentRequestId) {
      await this.stop();
    }

    /* 生成请求ID */
    this.currentRequestId = gen.id();
    /* 内容 */
    let completionContent = "";

    /* 消息 */
    let messages = this.Message.listWithOutType();

    try {
      /* 创建请求体 */
      let requestBody: AudioModelRequestBody = {
        model: this.info.model,
        input: messages[messages.length - 1].content,
        voice,
        speed,
      };

      this.Message.push([
        {
          role: "assistant",
          loading: true,
          content: "",
          created_at: Date.now(),
        },
      ]);

      /* 适配子类请求体 */
      requestBody = this.prepareRequestBody(requestBody);

      console.log(requestBody);

      // 监听流式响应事件
      const unlistenStream = await cmd.listen(
        `audio-stream-${this.currentRequestId}`,
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
        `audio-stream-error-${this.currentRequestId}`,
        (event) => {
          this.Message.updateLastMessage({
            error: `请求失败: ${event.payload}`,
          });
          throw new Error(event.payload);
        },
      );

      // 发起流式请求
      await cmd.invoke("audio_stream", {
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
    try {
      if (this.currentRequestId) {
        await cmd.invoke("cancel_stream", { requestId: this.currentRequestId });
        this.currentRequestId = undefined;
      }
    } catch (e) {
      console.error("Failed to stop stream:", e);
    }
  }
}
