/** 模型提供商接口 */
export interface ModelProvider<T = any, C = any> {
  /** 提供商名称 */
  name: string;
  /** 提供商描述 */
  description: string;
  /** 提供商图标 */
  icon?: React.ReactNode;
  /** 支持的模型列表 */
  models: Record<string, T>;
  /** 创建模型 */
  create: (model_name: string) => C;
}

/** 模型提供商列表 */
export type ModelProviderList<T extends ModelProvider<any, any>> = Record<
  string,
  T
>;
