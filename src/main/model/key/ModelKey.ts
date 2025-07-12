
import { Settings } from "../../app/Settings";

export class ModelKey {
  private static store = {} as Record<string, string>;
  private static readonly STORAGE_KEY = "model_api_keys";
  private static initialized = false;

  // 初始化，从持久化存储加载API密钥（应用启动时调用）
  static async init() {
    if (!this.initialized) {
      try {
        const savedKeys = await Settings.get(this.STORAGE_KEY);
        if (savedKeys && typeof savedKeys === 'object') {
          this.store = { ...savedKeys };
          console.log('API密钥加载成功:', Object.keys(this.store));
        }
      } catch (error) {
        console.error("加载API密钥失败:", error);
      }
      this.initialized = true;
    }
  }

  // 保存到持久化存储
  private static async save() {
    try {
      await Settings.set(this.STORAGE_KEY, this.store);
    } catch (error) {
      console.error("保存API密钥失败:", error);
    }
  }

  static set(provider: string, key: string) {
    this.store[provider] = key;
    // 异步保存，不阻塞
    this.save().catch(console.error);
  }

  static get(provider: string) {
    return this.store[provider];
  }
}
