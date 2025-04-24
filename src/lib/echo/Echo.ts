/**
 * Echoi 状态管理类
 * 一个轻量级的状态管理库，支持多种存储模式和状态管理功能
 *
 * 特性：
 * - 支持多种存储模式（临时、LocalStorage、IndexedDB）
 * - 支持跨窗口状态同步
 * - 支持 React Hooks 集成
 * - 支持状态订阅
 * - 支持选择器
 */
import { useEffect, useState } from "react";
import { IndexedDBAdapter } from "./IndexedDBAdapter";
import {
  IndexedDBConfig,
  SetOptions,
  StateUpdater,
  StorageConfig,
} from "./types";

/* 监听器类型 */
type Listener<T> = (state: T) => void;

/**
 * Echo 状态管理类
 * 一个轻量级的状态管理库，支持多种存储模式和状态管理功能
 *
 * 特性：
 * - 支持多种存储模式（临时、LocalStorage、IndexedDB）
 * - 支持跨窗口状态同步
 * - 支持 React Hooks 集成
 * - 支持状态订阅
 * - 支持选择器
 */
export class Echoi<T extends Record<string, any> | null | string | number> {
  /** 当前状态 */
  protected state: T;
  /** 初始化完成的Promise */
  protected readyPromise: Promise<void>;
  /** 是否已经完成初始化 */
  protected isInitialized = false;
  /** 监听器集合 */
  protected listeners: Set<Listener<T>> = new Set();
  /** 存储适配器 */
  protected storageAdapter: IndexedDBAdapter<T> | null = null;
  /** 跨窗口同步通道 */
  protected syncChannel: BroadcastChannel | null = null;
  /** 是否正在恢复状态 */
  protected isHydrating = false;
  /** 用于 React Hooks 的 hook 函数 */
  private hookRef:
    | (<Selected = T>(selector?: (state: T) => Selected) => Selected)
    | null = null;

  /**
   * 快速获取一个 IndexedDB 存储的实例
   * @param config 配置对象，包含 database、objectstore 和 name
   * @returns 配置好的 Echo 实例
   */
  public static get<
    T extends Record<string, any> | null | string | number,
  >(config: {
    database: string;
    objectstore?: string;
    name: string;
  }): Echoi<T> {
    // 当 name 为空字符串时，使用临时存储
    if (config.name === "") {
      return new Echoi<T>(null as T).temporary();
    }
    return new Echoi<T>(null as T).indexed({
      database: config.database,
      object: config.objectstore || "echo-state",
      name: config.name,
    });
  }

  constructor(protected readonly defaultState: T) {
    // 确保类型安全，处理null情况
    if (defaultState === null) {
      this.state = null as T;
    } else if (typeof defaultState === "object" && defaultState !== null) {
      this.state = { ...defaultState } as T;
    } else {
      this.state = defaultState;
    }
    this.readyPromise = Promise.resolve();
    this.hookRef = this.createHook();
  }

  protected async hydrate(): Promise<void> {
    if (!this.storageAdapter) return;

    try {
      const savedState = await this.storageAdapter.getItem();
      if (savedState) {
        this.isHydrating = true;
        this.set(savedState, { replace: true });
        this.isHydrating = false;
      } else {
        if (this.defaultState === null) {
          this.state = null as T;
        } else if (
          typeof this.defaultState === "object" &&
          this.defaultState !== null
        ) {
          this.state = { ...this.defaultState } as T;
        } else {
          this.state = this.defaultState;
        }
        // 只有当状态不为 null 时才存储
        if (this.state !== null) {
          await this.storageAdapter.setItem(this.state);
        }
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("Echo Core: 状态恢复失败", error);
      this.set(this.defaultState, { replace: true });
      this.isInitialized = true;
    }
  }

  public getDatabaseName(): string {
    if (!this.storageAdapter) {
      throw new Error("Echo Core: 请先设置存储模式");
    }
    if (!(this.storageAdapter instanceof IndexedDBAdapter)) {
      throw new Error(
        "Echo Core: getDatabaseName 方法仅限于 IndexedDB 方案使用",
      );
    }
    return this.storageAdapter.getDatabaseName();
  }

  public getKeyName(): string {
    if (!this.storageAdapter) {
      throw new Error("Echo Core: 请先设置存储模式");
    }
    if (!(this.storageAdapter instanceof IndexedDBAdapter)) {
      throw new Error(
        "Echo Core: getObjectStoreName 方法仅限于 IndexedDB 方案使用",
      );
    }
    return this.storageAdapter.getKeyName();
  }

  protected initSync(name: string): void {
    try {
      this.syncChannel = new BroadcastChannel(`echo-${name}`);
      this.syncChannel.onmessage = async (event) => {
        if (event.data?.type === "state-update") {
          this.set(event.data.state, { isFromSync: true, replace: true });
          if (this.storageAdapter) {
            await this.storageAdapter.setItem(event.data.state);
          }
        } else if (event.data?.type === "state-delete") {
          // 使用类型安全的方式处理状态删除
          if (typeof this.state === "object" && this.state !== null) {
            const newState = { ...this.state } as T;
            if (newState && typeof newState === "object") {
              delete (newState as any)[event.data.key];
              this.set(newState, { isFromSync: true, replace: true });
            }
          } else if (typeof this.state === "string") {
            this.set("" as unknown as T, { isFromSync: true, replace: true });
          } else if (typeof this.state === "number") {
            this.set(-1 as unknown as T, { isFromSync: true, replace: true });
          }

          if (this.storageAdapter) {
            await this.storageAdapter.setItem(this.state);
          }
        }
      };
    } catch (error) {
      console.warn("Echo Core: 跨窗口同步初始化失败", error);
    }
  }

  // 辅助方法，根据类型返回对应的空值
  private getEmptyValueForType<S>(value: S): S {
    if (typeof value === "string") {
      return "" as unknown as S;
    }
    if (typeof value === "number") {
      return -1 as unknown as S;
    }
    return value;
  }

  public set(
    nextState: Partial<T> | StateUpdater<T>,
    options: SetOptions = {},
  ): void {
    const oldState = this.state;

    // 处理函数式更新
    const newState =
      typeof nextState === "function"
        ? (nextState as StateUpdater<T>)(this.state)
        : nextState;

    // 处理null情况
    let finalState: T;
    if (options.replace) {
      finalState = newState as T;
    } else if (this.state === null) {
      finalState = newState as T;
    } else if (typeof this.state === "object" && this.state !== null) {
      finalState = { ...this.state, ...newState } as T;
    } else {
      finalState = newState as T;
    }

    const hasChanged = !this.isEqual(oldState, finalState);
    if (!hasChanged) return;

    this.state = finalState;

    if (!this.isHydrating && this.storageAdapter) {
      // 只有当状态不为 null 时才存储
      if (this.state !== null) {
        this.storageAdapter.setItem(this.state).catch((error) => {
          console.error("Echo Core: 状态保存失败", error);
        });
      } else {
        // 如果状态为 null，则删除存储
        this.storageAdapter.removeItem().catch((error) => {
          console.error("Echo Core: 状态删除失败", error);
        });
      }
    }

    if (this.syncChannel && !options.isFromSync && !this.isHydrating) {
      this.syncChannel.postMessage({
        type: "state-update",
        state: this.state,
      });
    }

    this.listeners.forEach((listener) => listener(this.state));
  }

  protected isEqual(obj1: any, obj2: any): boolean {
    // 处理相同引用
    if (obj1 === obj2) return true;

    // 处理null或非对象情况
    if (obj1 === null && obj2 === null) return true;
    if (obj1 === null || obj2 === null) return false;
    if (typeof obj1 !== "object" || typeof obj2 !== "object") return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(
      (key) => keys2.includes(key) && this.isEqual(obj1[key], obj2[key]),
    );
  }

  public delete(key: string): void {
    const oldState = this.state;

    // 如果状态为null，直接返回
    if (this.state === null) return;

    if (typeof this.state === "object" && this.state !== null) {
      const newState = { ...this.state };
      delete newState[key];
      this.state = newState as T;
    } else if (
      typeof this.state === "string" ||
      typeof this.state === "number"
    ) {
      this.state = this.getEmptyValueForType(this.state);
    }

    const hasChanged = !this.isEqual(oldState, this.state);
    if (!hasChanged) return;

    if (!this.isHydrating && this.storageAdapter) {
      this.storageAdapter.setItem(this.state).catch((error) => {
        console.error("Echo Core: 状态保存失败", error);
      });
    }

    if (this.syncChannel && !this.isHydrating) {
      this.syncChannel.postMessage({
        type: "state-delete",
        key: key,
      });
    }

    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * 删除 IndexedDB 当前store。
   */
  public async discard(): Promise<void> {
    if (!this.storageAdapter) {
      throw new Error("Echo Core: 请先设置存储模式");
    }

    if (!(this.storageAdapter instanceof IndexedDBAdapter)) {
      throw new Error("Echo Core: discard 方法仅限于 IndexedDB 方案使用");
    }

    try {
      await this.storageAdapter.discard();
      this.temporary();

      // 通知所有监听器
      this.listeners.forEach((listener) => listener(this.state));
    } catch (error) {
      console.error("Echo Core: 删除 key 失败", error);
      throw error;
    }
  }

  /**
   * 等待实例初始化完成，并设置状态
   * @param nextState 可选的下一个状态
   * @param options 可选的设置选项
   * @returns 初始化完成的Promise
   */
  public async ready(
    nextState?: Partial<T> | StateUpdater<T>,
    options: SetOptions = {},
  ): Promise<void> {
    if (nextState) {
      await this.readyPromise;
      this.set(nextState, options);
    }
    return this.readyPromise;
  }

  public async getCurrent(): Promise<T> {
    await this.ready();
    return this.state;
  }

  public get current(): T {
    // 只有在使用IndexedDB且未初始化时才抛出错误
    if (
      this.storageAdapter instanceof IndexedDBAdapter &&
      !this.isInitialized
    ) {
      throw new Error(
        "Echo Core: please use getCurrent() method or wait for ready() Promise to complete",
      );
    }
    return this.state;
  }

  public reset(): void {
    this.set(this.defaultState, { replace: true });
  }

  public subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public addListener(listener: Listener<T>): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: Listener<T>): void {
    this.listeners.delete(listener);
  }

  private createHook() {
    const self = this;
    return function useEchoCore<Selected = T>(
      selector?: (state: T) => Selected,
    ): Selected {
      const [state, setState] = useState<T | null>(
        self.isInitialized ? self.state : null,
      );

      const [, forceUpdate] = useState({});

      useEffect(() => {
        // 每次组件挂载或重新渲染时，检查初始化状态
        let isMounted = true;

        // 立即设置当前状态（如果已初始化）
        if (self.isInitialized) {
          setState(self.state);
        }

        // 无论如何都等待ready完成，以处理可能的存储模式切换
        self.ready().then(() => {
          if (isMounted) {
            setState(self.state);
            forceUpdate({});
          }
        });

        return () => {
          isMounted = false;
        };
      }, []);

      useEffect(() => {
        const listener = () => {
          setState(self.state);
          forceUpdate({});
        };
        self.addListener(listener);
        return () => {
          self.removeListener(listener);
        };
      }, []);

      if (state === null) {
        return selector
          ? selector(self.defaultState)
          : (self.defaultState as unknown as Selected);
      }

      return selector ? selector(state) : (state as unknown as Selected);
    };
  }

  public use<Selected = T>(selector?: (state: T) => Selected): Selected {
    if (!this.hookRef) {
      throw new Error("Hook 未初始化");
    }
    return this.hookRef(selector);
  }

  /**
   * 切换存储键名（仅限于 IndexedDB 方案使用）
   * @param name 新的存储键名
   * @returns 当前实例，用于链式调用
   */
  public switch(name: string): this {
    if (!this.storageAdapter) {
      throw new Error("Echo Core: 请先设置存储模式");
    }

    // 仅限于 IndexedDB 方案使用
    if (!(this.storageAdapter instanceof IndexedDBAdapter)) {
      throw new Error("Echo Core: switch 方法仅限于 IndexedDB 方案使用");
    }

    // 当 name 为空字符串时，切换到临时存储
    if (name === "") {
      return this.temporary();
    }

    // 获取当前配置
    const hasSync = !!this.syncChannel;

    // 保存当前数据库和对象仓库名称
    const database = this.storageAdapter.getDatabaseName();
    const object = this.storageAdapter.getObjectStoreName();

    // 清理当前资源
    this.cleanup();

    // 使用新配置重新初始化，保持相同的数据库和对象仓库
    this.storageAdapter = new IndexedDBAdapter<T>({
      name: name,
      database: database,
      object: object,
      sync: hasSync,
    });

    // 使用标准的 hydrate 方法，它会在没有持久化值时使用默认状态
    const hydratePromise = this.hydrate();
    this.readyPromise = hydratePromise;

    // 如果之前有同步，重新初始化同步
    if (hasSync) {
      this.initSync(name);
    }

    // 确保在hydrate完成后通知所有监听器，与indexed()方法行为保持一致
    hydratePromise
      .then(() => {
        if (this.isInitialized) {
          this.listeners.forEach((listener) => listener(this.state));
        }
      })
      .catch((error) => {
        console.error("Echo Core: 切换存储键名失败", error);
      });

    return this;
  }

  /**
   * 使用 IndexedDB 模式
   * @param config IndexedDB 配置
   */
  public indexed(config: IndexedDBConfig): this {
    // 当 name 为空字符串时，使用临时存储
    if (config.name === "") {
      return this.temporary();
    }
    this.cleanup();
    this.storageAdapter = new IndexedDBAdapter<T>(config);

    // 保存当前Promise以便可以等待它完成
    const hydratePromise = this.hydrate();
    this.readyPromise = hydratePromise;

    if (config.sync) {
      this.initSync(config.name);
    }

    // 确保在hydrate完成后通知所有监听器
    hydratePromise
      .then(() => {
        // 只有在初始化完成后才通知监听器
        if (this.isInitialized) {
          this.listeners.forEach((listener) => listener(this.state));
        }
      })
      .catch((error) => {
        console.error("Echo Core: 数据库初始化失败", error);
      });

    return this;
  }

  /**
   * 使用临时存储模式（不持久化）
   */
  public temporary(): this {
    this.cleanup();
    this.readyPromise = Promise.resolve();
    this.isInitialized = true;
    return this;
  }

  /**
   * 清理资源，
   * 持久化数据不会消失
   */
  private cleanup(): void {
    this.syncChannel?.close();
    this.syncChannel = null;
    this.storageAdapter?.close();
    this.storageAdapter = null;
    this.isInitialized = false;
  }

  /**
   * 销毁实例,
   * 持久化数据也会消失
   */
  public destroy(): void {
    this.cleanup();
    this.storageAdapter?.destroy();
  }
}

// 导出类型
export type { IndexedDBConfig, SetOptions, StateUpdater, StorageConfig };
