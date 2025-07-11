import { Agent } from "../Agent";
import { Engine } from "./Engine";

/** Engine 类型 */
export type EngineType = string;

export interface EngineProps {
  name: string;
  description: string;
  create: (agent: Agent) => Engine;
}

/** Engine 管理器 */
export class EngineManager {
  /** 已注册的 Engine */
  private static readonly engines: Record<EngineType, EngineProps> = {};

  /** 注册 Engine */
  public static register(type: EngineType, engine: EngineProps): void {
    this.engines[type] = engine;
  }

  /** 获取所有已注册的 Engine */
  public static getEngines(): Record<EngineType, EngineProps> {
    return this.engines;
  }

  /** 获取指定的 Engine */
  public static getEngine(type: EngineType): EngineProps | undefined {
    return this.engines[type];
  }

  /** 创建 Engine 实例 */
  public static create(agent: Agent): Engine {
    const EngineClass = this.getEngine(agent.infos.engine || "react");
    if (!EngineClass) {
      throw new Error(`Engine ${agent.infos.engine} not found`);
    }
    return EngineClass.create(agent);
  }
}
