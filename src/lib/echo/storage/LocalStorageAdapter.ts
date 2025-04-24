import { StorageAdapter, StorageConfig } from "../core/types";

/**
 * LocalStorage 存储适配器
 */
export class LocalStorageAdapter<T = any> implements StorageAdapter<T> {
  constructor(private readonly config: StorageConfig) {}

  get name(): string {
    return this.config.name;
  }

  async init(): Promise<void> {
    // LocalStorage 不需要特殊初始化
  }

  async getItem(): Promise<T | null> {
    const value = localStorage.getItem(this.name);
    if (value === null) return null;
    if (value === "undefined") return undefined as T;
    try {
      return JSON.parse(value);
    } catch (error) {
      return value as T;
    }
  }

  /**
   * 同步获取存储的值
   * @returns 存储的值或null
   */
  getItemSync(): T | null {
    const value = localStorage.getItem(this.name);
    if (value === null) return null;
    if (value === "undefined") return undefined as T;
    try {
      return JSON.parse(value);
    } catch (error) {
      return value as T;
    }
  }

  async setItem(value: T): Promise<void> {
    localStorage.setItem(this.name, JSON.stringify(value));
  }

  /**
   * 同步设置存储的值
   * @param value 要存储的值
   */
  setItemSync(value: T): void {
    localStorage.setItem(this.name, JSON.stringify(value));
  }

  async removeItem(): Promise<void> {
    localStorage.removeItem(this.name);
  }

  /**
   * 同步删除存储的值
   */
  removeItemSync(): void {
    localStorage.removeItem(this.name);
  }

  destroy(): void {
    this.removeItem();
  }

  close(): void {
    // LocalStorage 不需要特殊关闭
  }
}
