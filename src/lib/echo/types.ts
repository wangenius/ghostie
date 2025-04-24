/* 存储适配器接口 */
export interface StorageAdapter<T = any> {
  /** 获取存储名称 */
  readonly name: string;

  /** 初始化存储 */
  init(): Promise<void>;

  /** 获取数据 */
  getItem(): Promise<T | null>;

  /** 设置数据 */
  setItem(value: T): Promise<void>;

  /** 删除数据 */
  removeItem(): Promise<void>;

  /** 清理资源 */
  destroy(): void;

  /** 关闭存储 */
  close(): void;
}

/* 存储配置选项 */
export interface StorageConfig {
  /** 存储名称, 可以是 localStorage 的 key，或者是 indexedDB 的 key*/
  name: string;
  /** 是否启用跨窗口同步 */
  sync?: boolean;
}

/* IndexedDB 存储配置选项 */
export interface IndexedDBConfig extends StorageConfig {
  /** 数据库名称 */
  database: string;
  /** 对象存储空间名称，默认是 'echo-state' */
  object?: string;
}

/* 状态更新器类型 - 改进版 */
export type StateUpdater<T> = (
  state: T
) => T extends Record<string, any> ? Partial<T> | T : T;

/* 设置选项类型 */
export interface SetOptions {
  isFromSync?: boolean;
  replace?: boolean;
}
