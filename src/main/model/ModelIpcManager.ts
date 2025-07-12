import { IpcHandle, registerIpcHandlers, unregisterIpcHandlers } from "@/ipc/decorators";
import { ChatModelManager } from "./chat/ChatModelManager";
import { ImageModelManager } from "./image/ImageModelManager";
import { AudioModelManager } from "./audio/AudioModelManager";
import { VisionModelManager } from "./vision/VisionModelManager";
import { EmbeddingModelManager } from "./embedding/EmbeddingModelManger";

/**
 * 模型 IPC 管理器
 * 负责处理所有模型相关的 IPC 通信
 */
export class ModelIpcManager {
  private static instance: ModelIpcManager;

  private constructor() {
    // 自动注册 IPC 处理器
    registerIpcHandlers(this);
  }

  static getInstance(): ModelIpcManager {
    if (!ModelIpcManager.instance) {
      ModelIpcManager.instance = new ModelIpcManager();
    }
    return ModelIpcManager.instance;
  }

  /**
   * 清理提供商数据，移除不可序列化的字段
   * @param providers 原始提供商数据
   * @returns 清理后的提供商数据
   */
  private cleanProviders(providers: any): any {
    const cleaned: any = {};
    
    for (const [key, provider] of Object.entries(providers)) {
      if (provider && typeof provider === 'object') {
        // 移除 create 函数，保留其他字段
        const { create, ...cleanProvider } = provider as any;
        cleaned[key] = cleanProvider;
      }
    }
    
    return cleaned;
  }

  // ============ 模型相关 IPC 处理器 ============

  /**
   * 获取聊天模型提供商列表
   */
  @IpcHandle("model_get_chat_providers")
  async getChatModelProviders(): Promise<any> {
    try {
      const providers = ChatModelManager.getProviders();
      return this.cleanProviders(providers);
    } catch (error) {
      console.error("获取聊天模型提供商失败:", error);
      return {};
    }
  }

  /**
   * 获取图像模型提供商列表
   */
  @IpcHandle("model_get_image_providers")
  async getImageModelProviders(): Promise<any> {
    try {
      const providers = ImageModelManager.getProviders();
      return this.cleanProviders(providers);
    } catch (error) {
      console.error("获取图像模型提供商失败:", error);
      return {};
    }
  }

  /**
   * 获取音频模型提供商列表
   */
  @IpcHandle("model_get_audio_providers")
  async getAudioModelProviders(): Promise<any> {
    try {
      const providers = AudioModelManager.getProviders();
      return this.cleanProviders(providers);
    } catch (error) {
      console.error("获取音频模型提供商失败:", error);
      return {};
    }
  }

  /**
   * 获取视觉模型提供商列表
   */
  @IpcHandle("model_get_vision_providers")
  async getVisionModelProviders(): Promise<any> {
    try {
      const providers = VisionModelManager.getProviders();
      return this.cleanProviders(providers);
    } catch (error) {
      console.error("获取视觉模型提供商失败:", error);
      return {};
    }
  }

  /**
   * 获取嵌入模型提供商列表
   */
  @IpcHandle("model_get_embedding_providers")
  async getEmbeddingModelProviders(): Promise<any> {
    try {
      const providers = EmbeddingModelManager.getProviders();
      return this.cleanProviders(providers);
    } catch (error) {
      console.error("获取嵌入模型提供商失败:", error);
      return {};
    }
  }

  /**
   * 获取模型API密钥
   */
  @IpcHandle("model_get_api_key")
  async getModelApiKey(provider: string): Promise<string> {
    try {
      return ChatModelManager.getApiKey(provider) || "";
    } catch (error) {
      console.error("获取API密钥失败:", error);
      return "";
    }
  }

  /**
   * 设置模型API密钥
   */
  @IpcHandle("model_set_api_key")
  async setModelApiKey(provider: string, key: string): Promise<void> {
    try {
      ChatModelManager.setApiKey(provider, key);
    } catch (error) {
      console.error("设置API密钥失败:", error);
      throw new Error(`设置API密钥失败: ${error}`);
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    unregisterIpcHandlers(this);
  }
} 