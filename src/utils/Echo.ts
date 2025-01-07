/**
 * Echo 状态管理类
 */

import { create, StoreApi, UseBoundStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface EchoOptions {
  persist?: string;
  onChange?: (newState: any, oldState: any) => void;
}

const DEFAULT_OPTIONS = {
  persist: undefined,
  onChange: undefined,
};

/**
 * Echo 状态管理类
 */
class Echo<T, AllowNull extends boolean = false> {
  private readonly store: UseBoundStore<
    StoreApi<AllowNull extends true ? T | null : T>
  >;
  private readonly options: EchoOptions;

  constructor(
    private readonly defaultValue: AllowNull extends true ? T | null : T,
    options?: EchoOptions
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.store = this.initialize();
  }

  private initialize() {
    const createStore = <S extends AllowNull extends true ? T | null : T>(
      initialState: S,
      options: { persist?: string } = {}
    ) => {
      const store = options.persist
        ? create<S>()(
            persist(() => initialState, {
              name: options.persist,
              storage: createJSONStorage(() => localStorage),
            })
          )
        : create<S>(() => initialState);

      if (this.options.onChange) {
        const originalSetState = store.setState;
        store.setState = (updater: any, replace?: boolean) => {
          const oldState = store.getState();
          if (replace === true) {
            originalSetState(updater as S, true);
          } else {
            originalSetState((state: S) => ({
              ...state,
              ...(typeof updater === 'function' ? updater(state) : updater)
            }));
          }
          const newState = store.getState();
          if (!this.isEqual(oldState, newState)) {
            this.options.onChange?.(newState, oldState);
          }
        };
      }

      return store;
    };

    return createStore(this.defaultValue, {
      persist: this.options.persist,
    });
  }

  // 获取当前状态
  public get current(): AllowNull extends true ? T | null : T {
    return this.store.getState();
  }

  // 更新状态
  public get set() {
    return this.store.setState.bind(this.store);
  }

  public remove(path: string | string[]) {
    if (typeof this.current === "object" && this.current !== null) {
      this.store.setState((state) => {
        const newState = { ...state };
        if (!newState) return newState;
        
        const removePath = (obj: any, pathArr: string[]): void => {
          const [first, ...rest] = pathArr;
          if (rest.length === 0) {
            delete obj[first];
          } else if (obj[first] && typeof obj[first] === 'object') {
            removePath(obj[first], rest);
          }
        };

        if (Array.isArray(path)) {
          path.forEach(p => removePath(newState, p.split('.')));
        } else {
          removePath(newState, path.split('.'));
        }
        
        return newState;
      }, true);
    }
  }

  // 改进数组比较方法
  private areArraysEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => this.isEqual(item, arr2[index]));
  }

  // 添加常用方法
  public clear(): void {
    if (this.allowsNull()) {
      this.store.setState(null as any, true);
    } else {
      this.store.setState(this.defaultValue as T, true);
    }
  }

  public reset(): void {
    this.set(this.defaultValue as AllowNull extends true ? T | null : T, true);
  }

  /**
   * 用选择器订阅状态变
   * @param selector 可选的选择器函数，用于选择状态的特定部分
   * @returns 如果提供选择器则返回选择的值，否则返回整个状态
   */
  public use(): AllowNull extends true ? T | null : T;
  public use<Selected>(
    selector: (state: AllowNull extends true ? T | null : T) => Selected
  ): Selected;
  public use<Selected>(
    selector?: (state: AllowNull extends true ? T | null : T) => Selected
  ): (AllowNull extends true ? T | null : T) | Selected {
    if (!selector) return this.store();
    return this.store(selector);
  }

  // 辅助方法，用于类型检查
  private allowsNull(): AllowNull {
    return false as AllowNull;
  }

  /**
   * 改进的深度比较方法
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;

    // 处理数组
    if (Array.isArray(a) && Array.isArray(b)) {
      return this.areArraysEqual(a, b);
    }

    // 处理日期对象
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // 处理普通对象
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return !keysA.some((key) => !this.isEqual(a[key], b[key]));
  }
}

export { Echo, type EchoOptions };

