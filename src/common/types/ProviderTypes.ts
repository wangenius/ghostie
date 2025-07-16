/**
 * Provider 配置项接口
 */
export interface ProviderConfigItem {
  /** Provider */
  id: string;
  /** Provider 格式类型 */
  format: "openai" | "qwen" | "anthropic";
  /** 显示名称 */
  name: string;
  /** API 密钥 */
  apiKey: string;
  /** API 基础 URL */
  baseUrl: string;
  /** 模型列表 */
  models: string[];
}

/**
 * Provider 测试结果接口
 */
export interface ProviderTestResult {
  /** 测试是否成功 */
  success: boolean;
  /** 错误信息（如果测试失败） */
  error?: string;
}
