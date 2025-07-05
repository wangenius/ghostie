import { AudioModel } from "../AudioModel";
import { AudioModelManager, AudioModelProvider } from "../AudioModelManager";

export class Doubao extends AudioModel {
  constructor(model: string) {
    const api_key = AudioModelManager.getApiKey(DoubaoAudioProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://openspeech.bytedance.com/api/v1/tts",
    };
    super(configWithDefaults, DoubaoAudioProvider.models[model]);
  }
}

// 注册OpenAI提供商
const DoubaoAudioProvider: AudioModelProvider = {
  name: "doubao-audio",
  description: "Doubao 语音合成模型",
  icon: "doubao-color.svg",
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
  create: (model_name: string) => new Doubao(model_name),
};

// 注册到AudioModel
AudioModelManager.registerProvider(DoubaoAudioProvider);
