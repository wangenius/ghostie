import { useCallback, useState, useEffect } from "react";
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
  const [providersByType, setProvidersByType] = useState<Record<ModelType, Record<string, ModelProvider>>>({
    [ModelType.TEXT]: {},
    [ModelType.IMAGE]: {},
    [ModelType.AUDIO]: {},
    [ModelType.VISION]: {},
    [ModelType.EMBEDDING]: {},
  });
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
      
      // 更新指定类型的提供商，不影响其他类型
      setProvidersByType(prev => ({
        ...prev,
        [type]: result
      }));
      
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
      for (const typeProviders of Object.values(providersByType)) {
        for (const providerName of Object.keys(typeProviders)) {
          const key = await getApiKey(providerName);
          if (key) {
            keys[providerName] = key;
          }
        }
      }
    } catch (err) {
      console.error("获取所有API密钥失败:", err);
    }
    
    return keys;
  }, [providersByType, getApiKey]);

  // 获取模型数组（用于下拉选择等）
  const getModelsArray = useCallback((type?: ModelType) => {
    const targetProviders = type ? providersByType[type] : {};
    
    return Object.values(targetProviders).flatMap(provider => {
      return Object.values(provider.models).map((model: any) => ({
        label: model.name,
        value: {
          provider: provider.name,
          name: model.name,
        },
        type: provider.name,
        description: model.description,
        provider: provider,
        model: model,
      }));
    });
  }, [providersByType]);

  // 初始化时获取聊天模型
  useEffect(() => {
    fetchProviders(ModelType.TEXT);
  }, [fetchProviders]);

  return {
    providers: providersByType,
    loading,
    error,
    fetchProviders,
    getApiKey,
    setApiKey,
    getAllApiKeys,
    // 为了向后兼容，保留 models 属性
    models: getModelsArray(),
    getModelsArray,
  };
};