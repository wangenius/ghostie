import { gen } from "@/utils/generator";
import { Model } from "@/model/types/model";
import { Echo } from "echo-state";

/** 模型管理器, 用于管理模型 */
export class ModelManager {
  /** 模型存储 */
  static store = new Echo<Record<string, Model>>({}).localStorage({
    name: "models",
  });

  static get(id: string) {
    return this.store.current[id];
  }

  static use = ModelManager.store.use.bind(ModelManager.store);

  static add(model: Omit<Model, "id">): Model {
    const id = gen.id();

    const newModel: Model = {
      ...model,
      id,
    };

    ModelManager.store.set({
      [id]: newModel,
    });
    return newModel;
  }
  static copy(id: string) {
    const model = ModelManager.get(id);
    ModelManager.add({
      name: model.name + " 副本",
      model: model.model,
      api_key: model.api_key,
      api_url: model.api_url,
      type: model.type,
    });
  }
  static remove(id: string) {
    ModelManager.store.delete(id);
  }

  static update(id: string, model: Model) {
    ModelManager.store.set({
      [id]: model,
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
      Object.values(models).forEach((model) => {
        ModelManager.add(model);
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("JSON格式不正确");
      }
      throw error;
    }
  }
}
