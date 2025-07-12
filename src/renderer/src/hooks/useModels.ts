import { useState, useEffect, useCallback } from "react";
import { cmd } from "../utils/shell";

export enum ModelType {
  TEXT = "text",
  EMBEDDING = "embedding", 
  VISION = "vision",
  IMAGE = "image",
  AUDIO = "audio",
}

export interface ModelProvider {
  name: string;
  description: string;
  icon: string;
  models: Record<string, any>;
}

export const useModels = () => {
  const [providers, setProviders] = useState<Record<string, ModelProvider>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取指定类型的模型提供商
  const fetchProviders = useCallback(async (type: ModelType) => {
    try {
      setLoading(true);
      setError(null);
      
      let result: Record<string, ModelProvider> = {};
      
      switch (type) {
        case ModelType.TEXT:
          result = await cmd.invoke<Record<string, ModelProvider>>("model_get_chat_providers");
          break;
        case ModelType.IMAGE:
          result = await cmd.invoke<Record<string, ModelProvider>>("model_get_image_providers");
          break;
        case ModelType.AUDIO:
          result = await cmd.invoke<Record<string, ModelProvider>>("model_get_audio_providers");
          break;
        case ModelType.VISION:
          result = await cmd.invoke<Record<string, ModelProvider>>("model_get_vision_providers");
          break;
        case ModelType.EMBEDDING:
          result = await cmd.invoke<Record<string, ModelProvider>>("model_get_embedding_providers");
          break;
        default:
          result = {};
      }
      
      setProviders(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取模型提供商失败";
      setError(errorMessage);
      console.error("获取模型提供商失败:", err);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取API密钥
  const getApiKey = useCallback(async (provider: string): Promise<string> => {
    try {
      return await cmd.invoke<string>("model_get_api_key", provider);
    } catch (err) {
      console.error("获取API密钥失败:", err);
      return "";
    }
  }, []);

  // 设置API密钥
  const setApiKey = useCallback(async (provider: string, key: string): Promise<void> => {
    try {
      await cmd.invoke("model_set_api_key", provider, key);
    } catch (err) {
      console.error("设置API密钥失败:", err);
      throw new Error(`设置API密钥失败: ${err}`);
    }
  }, []);

  // 获取所有API密钥
  const getAllApiKeys = useCallback(async (): Promise<Record<string, string>> => {
    const keys: Record<string, string> = {};
    
    try {
      // 获取所有提供商的API密钥
      for (const providerName of Object.keys(providers)) {
        const key = await getApiKey(providerName);
        if (key) {
          keys[providerName] = key;
        }
      }
    } catch (err) {
      console.error("获取所有API密钥失败:", err);
    }
    
    return keys;
  }, [providers, getApiKey]);

  return {
    providers,
    loading,
    error,
    fetchProviders,
    getApiKey,
    setApiKey,
    getAllApiKeys,
  };
};