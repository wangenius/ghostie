import { useEffect, useState } from "react";
import { LocalStorageAdapter } from "../storage/LocalStorageAdapter";
import { SetOptions, StateUpdater } from "./types";

/* 监听器类型 */
type Listener<T> = (state: T) => void;

/**
 * LocalEcho
 * 一个轻量级的状态管理库，专门使用 LocalStorage 作为存储
 * 区别于Echo类，LocalEcho支持同步操作，不需要等待异步初始化
 *
 * 特性：
 * - 基于LocalStorage的同步状态管理
 * - 支持跨窗口状态同步
 * - 支持 React Hooks 集成
 * - 支持状态订阅
 * - 支持选择器
 */
export class LocalEcho<T extends Record<string, any> | null | string | number> {
  /** 当前状态 */
  protected state: T;
  /** 是否已经完成初始化 */
  protected isInitialized = true;
  /** 监听器集合 */
  protected listeners: Set<Listener<T>> = new Set();
  /** 存储适配器 */
  protected storageAdapter: LocalStorageAdapter<T> | null = null;
  /** 跨窗口同步通道 */
  protected syncChannel: BroadcastChannel | null = null;
  /** 是否正在恢复状态 */
  protected isHydrating = false;
  /** 存储键名 */
  protected storageName: string = "";
  /** 用于 React Hooks 的 hook 函数 */
  private hookRef:
    | (<Selected = T>(selector?: (state: T) => Selected) => Selected)
    | null = null;

  /**
   * 创建一个LocalEcho实例
   * @param defaultState 默认状态
   * @param name 存储键名
   * @param sync 是否支持跨窗口同步，默认true
   */
  constructor(
    protected readonly defaultState: T,
    name: string = "",
    sync: boolean = true
  ) {
    // 确保类型安全，处理null情况
    if (defaultState === null) {
      this.state = null as T;
    } else if (typeof defaultState === "object" && defaultState !== null) {
      this.state = { ...defaultState } as T;
    } else {
      this.state = defaultState;
    }

    this.hookRef = this.createHook();

    // 如果name为空，使用临时存储
    if (name === "") {
      return;
    }

    this.storageName = name;
    this.storageAdapter = new LocalStorageAdapter<T>({
      name: name,
      sync: false, // 我们会自己处理同步
    });

    // 同步操作：立即从localStorage获取数据
    this.hydrateSync();

    // 如果需要，初始化跨窗口同步
    if (sync) {
      this.initSync(name);
    }
  }

  /**
   * 同步方式获取并设置状态
   */
  protected hydrateSync(): void {
    if (!this.storageAdapter) return;

    try {
      const savedState = this.storageAdapter.getItemSync();
      if (savedState) {
        this.isHydrating = true;
        this.set(savedState);
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
          this.storageAdapter.setItemSync(this.state);
        }
      }
    } catch (error) {
      console.error("LocalEcho: 状态恢复失败", error);
      this.set(this.defaultState, { replace: true });
    }
  }

  protected initSync(name: string): void {
    try {
      this.syncChannel = new BroadcastChannel(`echo-${name}`);
      this.syncChannel.onmessage = (event) => {
        if (event.data?.type === "state-update") {
          this.set(event.data.state, { isFromSync: true, replace: true });
          if (this.storageAdapter) {
            this.storageAdapter.setItemSync(event.data.state);
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
            this.storageAdapter.setItemSync(this.state);
          }
        }
      };

      // 监听storage事件，支持不同标签页之间的同步
      window.addEventListener("storage", this.handleStorageChange);
    } catch (error) {
      console.warn("LocalEcho: 跨窗口同步初始化失败", error);
    }
  }

  // 处理localStorage的storage事件，实现不同标签页之间的同步
  private handleStorageChange = (event: StorageEvent) => {
    if (event.key === `echo-${this.storageName}` && event.newValue) {
      try {
        const newState = JSON.parse(event.newValue);
        this.set(newState, { isFromSync: true, replace: true });
      } catch (e) {
        console.error("LocalEcho: storage事件处理失败", e);
      }
    }
  };

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
    options: SetOptions = {}
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
        this.storageAdapter.setItemSync(this.state);
      } else {
        // 如果状态为 null，则删除存储
        this.storageAdapter.removeItemSync();
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
      (key) => keys2.includes(key) && this.isEqual(obj1[key], obj2[key])
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
      this.storageAdapter.setItemSync(this.state);
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
   * 获取当前状态，同步方法
   */
  public get current(): T {
    return this.state;
  }

  /**
   * 重置状态为默认值
   */
  public reset(): void {
    this.set(this.defaultState, { replace: true });
  }

  /**
   * 订阅状态变化
   * @param listener 监听器函数
   * @returns 取消订阅的函数
   */
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
    return function useLocalEcho<Selected = T>(
      selector?: (state: T) => Selected
    ): Selected {
      const [state, setState] = useState<T>(self.state);

      useEffect(() => {
        const listener = () => {
          setState(self.state);
        };
        self.addListener(listener);
        return () => {
          self.removeListener(listener);
        };
      }, []);

      return selector ? selector(state) : (state as unknown as Selected);
    };
  }

  /**
   * React Hook，用于在组件中使用状态
   * @param selector 可选的选择器函数，用于从状态中选择部分数据
   * @returns 选择的状态或整个状态
   */
  public use<Selected = T>(selector?: (state: T) => Selected): Selected {
    if (!this.hookRef) {
      throw new Error("Hook 未初始化");
    }
    return this.hookRef(selector);
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    if (this.syncChannel) {
      this.syncChannel.close();
      this.syncChannel = null;
      window.removeEventListener("storage", this.handleStorageChange);
    }
    
    if (this.storageAdapter) {
      this.storageAdapter.destroy();
      this.storageAdapter = null;
    }
    
    this.listeners.clear();
  }
} 