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
}
