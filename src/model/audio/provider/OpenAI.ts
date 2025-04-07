import { AudioModelRequestBody } from "@/model/types/audioModel";
import { AudioModel } from "../AudioModel";
import { AudioModelManager, AudioModelProvider } from "../AudioModelManager";

export class OpenAI extends AudioModel {
  constructor(model: string) {
    const api_key = AudioModelManager.getApiKey(OpenAIProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://api.openai.com/v1/audio/speech",
    };
    super(configWithDefaults, OpenAIProvider.models[model]);
  }

  /**
   * 创建符合OpenAI规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: AudioModelRequestBody,
  ): AudioModelRequestBody {
    return {
      ...body,
      response_format: "mp3", // OpenAI 默认返回 mp3 格式
    };
  }

  /**
   * 解析OpenAI的响应格式
   * @param payload 原始响应数据
   * @returns 解析后的内容
   */
  protected parseResponseBody(payload: string): {
    completion?: string;
  } {
    try {
      // OpenAI 音频流式响应格式
      const data = JSON.parse(payload.replace("data: ", ""));
      const delta = data.choices?.[0]?.delta;
      // 提取内容
      const completion = delta?.content;
      return { completion };
    } catch (error) {
      return {};
    }
  }
}

// 注册OpenAI提供商
const OpenAIProvider: AudioModelProvider = {
  name: "openai-audio",
  description: "OpenAI 语音合成模型",
  icon: "openai.svg",
  models: {
    "tts-1": {
      name: "tts-1",
      supportStream: true,
      voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
      speedRange: [0.25, 4.0],
      contextWindow: 4096,
      description: "OpenAI TTS-1 模型",
    },
    "tts-1-hd": {
      name: "tts-1-hd",
      supportStream: true,
      voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
      speedRange: [0.25, 4.0],
      contextWindow: 4096,
      description: "OpenAI TTS-1 HD 模型",
    },
  },
  create: (model_name: string) => new OpenAI(model_name),
};

// 注册到AudioModel
AudioModelManager.registerProvider(OpenAIProvider);
