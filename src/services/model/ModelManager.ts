import { Model } from "@common/types/model";
import { Echo } from "echo-state";

/** 模型管理器, 用于管理模型

 */
export class ModelManager {
  /** 模型存储 */
  static store = new Echo<Record<string, Model>>(
    {},
    {
      name: "models",
      sync: true,
    }
  );

  static get(name: string) {
    return this.store.current[name];
  }

  static use = ModelManager.store.use.bind(ModelManager.store);

  static add(model: Model) {
    if (!model.name) {
      throw new Error("模型名称不能为空");
    }
    /* 判断是否已经有这个模型 */
    if (ModelManager.store.current[model.name]) {
      throw new Error(`模型 ${model.name} 已存在`);
    }

    ModelManager.store.set({
      [model.name]: model,
    });
  }

  static remove(name: string) {
    ModelManager.store.delete(name);
  }

  static update(name: string, model: Model) {
    if (!model.name) {
      throw new Error("模型名称不能为空");
    }
    if (name !== model.name) {
      ModelManager.remove(name);
    }
    ModelManager.store.set({
      [model.name]: model,
    });
  }

  /** 导出所有模型配置 */
  static export(): string {
    const models = this.store.current;
    return JSON.stringify(models, null, 2);
  }

  /** 导入模型配置
   * @param jsonStr JSON字符串
   * @throws 如果JSON格式不正确或模型配置无效
   */
  static import(jsonStr: string) {
    try {
      const models = JSON.parse(jsonStr) as Record<string, Model>;

      // 验证每个模型的必要字段
      Object.entries(models).forEach(([name, model]) => {
        if (!model.api_key || !model.api_url || !model.model) {
          throw new Error(`模型 "${name}" 缺少必要字段`);
        }
        // 确保name字段与key一致
        model.name = name;
      });

      // 更新存储
      this.store.set(models);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("JSON格式不正确");
      }
      throw error;
    }
  }
}
