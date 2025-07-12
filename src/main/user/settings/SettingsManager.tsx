
// 新增：定义代理设置接口
interface ProxySettingsConfig {
  enabled: boolean;
  host: string;
  port: string; // 使用字符串以便于Input组件处理
}

interface SettingsProps {
  theme: { name: string; label: string };
  font: { name: string; label: string };
  language: string;
  reActMaxIterations: number;
  sortType: "default" | "mostUsed" | "recentUsed";
  maxHistory: number;
  knowledge: {
    threshold: number;
    limit: number;
    /** 基础拆解的模型
     * 用于将文本拆解为更小的单元，用于后续的搜索和处理
     * 格式为：provider_name:model_name
     * for example: alibaba:
     */
    baseModel: string;
    /** 搜索模型
     * 用于搜索和匹配知识库中的内容
     * 格式为：provider_name:model_name
     * for example: alibaba:tongyi
     */
    searchModel: string;
    /**  */
    chunkSize: number;
  };
  proxy: ProxySettingsConfig; // 新增：代理设置字段
}

/* 设置管理 */
export class SettingsManager {
  private static store = {
    theme: { name: "light", label: "light" },
    font: { name: "maple", label: "maple" },
    language: "zh-CN",
    reActMaxIterations: 10,
    sortType: "default",
    maxHistory: 30,
    knowledge: {
      threshold: 0.6,
      limit: 10,
      baseModel: "",
      searchModel: "",
      chunkSize: 425,
    },
    // 新增：代理默认设置
    proxy: {
      enabled: false,
      host: "127.0.0.1",
      port: "1080",
    },
  };

  static get current() {
    return this.store;
  }

  public static getTheme() {
    return this.store.theme;
  }

  public static setKnowledge(knowledge: Partial<SettingsProps["knowledge"]>) {
    this.store.knowledge = { ...this.store.knowledge, ...knowledge };
  }

  public static getReactMaxIterations() {
    return this.store.reActMaxIterations;
  }

  public static setReactMaxIterations(maxIterations: number) {
    this.store.reActMaxIterations = maxIterations;
  }

  public static setTheme(theme: { name: string; label: string }) {
    this.store.theme = theme;
  }

  public static getSortType() {
    return this.store.sortType;
  }

  public static setSortType(sortType: "default" | "mostUsed" | "recentUsed") {
    this.store.sortType = sortType;
  }

  public static getFont() {
    return this.store.font;
  }

  public static setFont(font: { name: string; label: string }) {
    this.store.font = font;
  }

  public static getMaxHistory() {
        return this.store.maxHistory;
  }

  public static setMaxHistory(maxHistory: number) {
    this.store.maxHistory = maxHistory;
  }

  // 新增：更新代理设置的方法
  public static setProxy(proxyConfig: Partial<ProxySettingsConfig>) {
    this.store.proxy = { ...this.store.proxy, ...proxyConfig };
  }
}
