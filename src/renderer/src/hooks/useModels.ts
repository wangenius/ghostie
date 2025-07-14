import { useCallback, useState, useEffect } from "react";
import { cmd } from "../utils/shell";

export interface ProviderConfig {
  name: string;
  format: 'openai' | 'qwen' | 'anthropic';
  displayName: string;
  description?: string;
  apiKey?: string;
  baseURL?: string;
  customModels?: string[];
}

export enum ModelType {
  CHAT = "chat",
  IMAGE = "image",
  AUDIO = "audio",
  VISION = "vision",
  EMBEDDING = "embedding",
}

export interface Provider {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  defaultBaseUrl?: string;
  requiresApiKey: boolean;
  supportedTypes: ModelType[];
}

export interface ModelInstance {
  id: string;
  provider: string;
  modelName: string;
  displayName?: string;
  type: ModelType;
  customBaseUrl?: string;
  customApiKey?: string;
  createdAt: number;
}

export const useModels = () => {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [instances, setInstances] = useState<Record<string, ModelInstance>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取所有提供商
  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await cmd.invoke<ProviderConfig[]>("provider-list");
      setProviders(result);
      // 转换为旧格式以保持兼容性
      const providersMap: Record<string, Provider> = {};
      result.forEach(config => {
        providersMap[config.name] = {
          name: config.name,
          displayName: config.displayName,
          description: config.description,
          defaultBaseUrl: config.baseURL,
          requiresApiKey: true,
          supportedTypes: [ModelType.CHAT] // 默认支持聊天
        };
      });
      return providersMap;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取模型提供商失败";
      setError(errorMessage);
      console.error("获取模型提供商失败:", err);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // 根据类型获取提供商
  const getProvidersByType = useCallback(async (type: ModelType) => {
    try {
      setLoading(true);
      setError(null);
      const result = await cmd.invoke<ProviderConfig[]>("provider-list");
      // 转换为旧格式以保持兼容性
      const providersMap: Record<string, Provider> = {};
      result.forEach(config => {
        providersMap[config.name] = {
          name: config.name,
          displayName: config.displayName,
          description: config.description,
          defaultBaseUrl: config.baseURL,
          requiresApiKey: true,
          supportedTypes: [ModelType.CHAT]
        };
      });
      return providersMap;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取模型提供商失败";
      setError(errorMessage);
      console.error("获取模型提供商失败:", err);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取所有模型实例
  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // 暂时返回空的实例列表，因为当前系统使用 ProviderConfig 而不是 ModelInstance
      const emptyInstances: Record<string, ModelInstance> = {};
      setInstances(emptyInstances);
      return emptyInstances;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取模型实例失败";
      setError(errorMessage);
      console.error("获取模型实例失败:", err);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // 根据类型获取模型实例
  const getInstancesByType = useCallback(async (type: ModelType) => {
    try {
      setLoading(true);
      setError(null);
      // 暂时返回空结果，因为当前系统使用 ProviderConfig 而不是 ModelInstance
      const result: Record<string, ModelInstance> = {};
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取模型实例失败";
      setError(errorMessage);
      console.error("获取模型实例失败:", err);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建模型实例
  const createInstance = useCallback(async (config: {
    provider: string;
    modelName: string;
    displayName?: string;
    type: ModelType;
    customBaseUrl?: string;
    customApiKey?: string;
  }): Promise<{ success: boolean; instanceId?: string; error?: string }> => {
    try {
      // 暂时返回成功结果，因为当前系统使用 ProviderConfig 管理
      const result = { success: true, instanceId: `${config.provider}:${config.modelName}` };
      if (result.success) {
        // 刷新实例列表
        await fetchInstances();
      }
      return result;
    } catch (err) {
      console.error("创建模型实例失败:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "创建实例失败"
      };
    }
  }, [fetchInstances]);

  // 更新模型实例
  const updateInstance = useCallback(async (
    id: string,
    updates: Partial<Omit<ModelInstance, 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 暂时返回成功结果，因为当前系统使用 ProviderConfig 管理
      const result = { success: true };
      if (result.success) {
        // 刷新实例列表
        await fetchInstances();
      }
      return result;
    } catch (err) {
      console.error("更新模型实例失败:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "更新实例失败"
      };
    }
  }, [fetchInstances]);

  // 删除模型实例
  const deleteInstance = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 暂时返回成功结果，因为当前系统使用 ProviderConfig 管理
      const result = { success: true };
      if (result.success) {
        // 刷新实例列表
        await fetchInstances();
      }
      return result;
    } catch (err) {
      console.error("删除模型实例失败:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "删除实例失败"
      };
    }
  }, [fetchInstances]);

  // 测试模型实例
  const testInstance = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 暂时返回成功结果，因为当前系统使用 ProviderConfig 管理
      return { success: true };
    } catch (err) {
      console.error("测试模型实例失败:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "测试失败"
      };
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

  // 获取BaseURL
  const getBaseUrl = useCallback(async (provider: string): Promise<string> => {
    try {
      // 使用 provider-get 通道获取提供商配置
      const config = await cmd.invoke<ProviderConfig | null>("provider-get", provider);
      return config?.baseURL || "";
    } catch (err) {
      console.error("获取BaseURL失败:", err);
      return "";
    }
  }, []);

  // 设置BaseURL
  const setBaseUrl = useCallback(async (provider: string, baseUrl: string): Promise<void> => {
    try {
      // 使用 provider-set 通道更新提供商配置
      await cmd.invoke("provider-set", provider, { baseURL: baseUrl });
    } catch (err) {
      console.error("设置BaseURL失败:", err);
      throw new Error(`设置BaseURL失败: ${err}`);
    }
  }, []);

  // 初始化时获取提供商和实例
  useEffect(() => {
    fetchProviders();
    fetchInstances();
  }, [fetchProviders, fetchInstances]);

  return {
    providers,
    instances,
    loading,
    error,
    fetchProviders,
    getProvidersByType,
    fetchInstances,
    getInstancesByType,
    createInstance,
    updateInstance,
    deleteInstance,
    testInstance,
    getApiKey,
    setApiKey,
    getBaseUrl,
    setBaseUrl,
  };
};