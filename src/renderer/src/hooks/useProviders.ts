import { useCallback, useEffect, useState } from "react";
import { cmd } from "../utils/shell";

export interface ProviderConfigItem {
  name: string;
  format: "openai" | "qwen" | "anthropic";
  displayName: string;
  description?: string;
  apiKey?: string;
  baseURL?: string;
  customModels?: string[]; // 用户自定义的模型列表
}

export const useProviders = () => {
  const [providers, setProviders] = useState<ProviderConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取所有Provider配置
  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await cmd.invoke<ProviderConfigItem[]>("provider-list");
      console.log(result);
      
      setProviders(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "获取Provider配置失败";
      setError(errorMessage);
      console.error("获取Provider配置失败:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取特定Provider的配置
  const getProvider = useCallback(async (name: string) => {
    try {
      return await cmd.invoke<ProviderConfigItem | null>("provider-get", name);
    } catch (err) {
      console.error("获取Provider配置失败:", err);
      return null;
    }
  }, []);

  // 设置Provider配置
  const setProviderConfig = useCallback(
    async (name: string, config: { apiKey?: string; baseURL?: string }) => {
      try {
        await cmd.invoke("provider-set", name, config);
        // 刷新Provider列表
        await fetchProviders();
      } catch (err) {
        console.error("设置Provider配置失败:", err);
        throw new Error(`设置Provider配置失败: ${err}`);
      }
    },
    [fetchProviders],
  );

  // 添加自定义Provider
  const addCustomProvider = useCallback(
    async (config: ProviderConfigItem) => {
      try {
        setLoading(true);
        setError(null);
        await cmd.invoke("provider-add", config);
        // 重新获取列表
        await fetchProviders();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "添加Provider失败";
        setError(errorMessage);
        console.error("添加Provider失败:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchProviders],
  );

  // 删除自定义Provider
  const removeCustomProvider = useCallback(
    async (name: string) => {
      try {
        await cmd.invoke("provider-remove", name);
        // 刷新Provider列表
        await fetchProviders();
      } catch (err) {
        console.error("删除自定义Provider失败:", err);
        throw new Error(`删除自定义Provider失败: ${err}`);
      }
    },
    [fetchProviders],
  );

  // 获取支持的格式
  const getSupportedFormats = useCallback(async () => {
    try {
      const result = await cmd.invoke<string[]>("provider-supported-formats");
      return result;
    } catch (err) {
      console.error("获取支持格式失败:", err);
      return ["openai", "qwen", "anthropic"]; // 默认支持的格式
    }
  }, []);

  // 获取常用模型列表
  const getCommonModels = useCallback(async (format: string) => {
    try {
      return await cmd.invoke<string[]>("provider-models", format);
    } catch (err) {
      console.error("获取常用模型失败:", err);
      return [];
    }
  }, []);

  // 获取特定Provider的模型列表（包括自定义模型）
  const getProviderModels = useCallback(async (providerName: string) => {
    try {
      return await cmd.invoke<string[]>("provider-get-models", providerName);
    } catch (err) {
      console.error("获取Provider模型列表失败:", err);
      return [];
    }
  }, []);

  // 设置Provider的自定义模型列表
  const setProviderModels = useCallback(async (providerName: string, models: string[]) => {
    try {
      await cmd.invoke("provider-set-models", providerName, models);
      // 刷新Provider列表
      await fetchProviders();
    } catch (err) {
      console.error("设置Provider模型列表失败:", err);
      throw new Error(`设置Provider模型列表失败: ${err}`);
    }
  }, [fetchProviders]);

  // 初始化时获取Provider列表
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // 更新Provider配置
  const updateProvider = useCallback(
    async (name: string, updates: Partial<ProviderConfigItem>) => {
      try {
        setLoading(true);
        setError(null);
        await cmd.invoke("provider-update", name, updates);
        // 重新获取列表
        await fetchProviders();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "更新Provider失败";
        setError(errorMessage);
        console.error("更新Provider失败:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchProviders],
  );

  // 删除Provider配置
  const deleteProvider = useCallback(
    async (name: string) => {
      try {
        setLoading(true);
        setError(null);
        await cmd.invoke("provider-delete", name);
        // 重新获取列表
        await fetchProviders();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "删除Provider失败";
        setError(errorMessage);
        console.error("删除Provider失败:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchProviders],
  );

  // 测试Provider连接
  const testProvider = useCallback(async (config: ProviderConfigItem) => {
    try {
      const result = await cmd.invoke<{ success: boolean; error?: string }>(
        "provider-test",
        config,
      );
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "测试Provider失败";
      console.error("测试Provider失败:", err);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    providers,
    loading,
    error,
    fetchProviders,
    getProvider,
    setProviderConfig,
    addCustomProvider,
    removeCustomProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    getSupportedFormats,
    getCommonModels,
    getProviderModels,
    setProviderModels,
  };
};
