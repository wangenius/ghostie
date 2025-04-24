import { useSyncExternalStore } from "react";
import { SetOptions, StateUpdater } from "./types";
/* 监听器类型 */
type Listener<T> = (state: T) => void;
export class Echoa<T extends any> {
    /** 当前状态 */
    protected state: T;

    /** 监听器集合 */
    protected listeners: Set<Listener<T>> = new Set();

    constructor(protected readonly defaultState: T) {
      // 确保类型安全，处理null情况
      if (defaultState === null) {
        this.state = null as T;
      } else if (typeof defaultState === "object" && defaultState !== null) {
        this.state = Array.isArray(defaultState) ? [...defaultState] as T : { ...defaultState } as T;
      } else {
        this.state = defaultState;
      }
    }
  
    public set(
      nextState: Partial<T> | StateUpdater<T>,
      options: SetOptions = {}
    ): void {
      const oldState = this.state;
  
      // 处理函数式更新
      const updater = typeof nextState === "function"
        ? (nextState as StateUpdater<T>)
        : () => nextState;
  
      const updatedStateSlice = updater(this.state);
  
      // 基于 options.replace 和状态类型合并状态
      let finalState: T;
      if (options.replace) {
        finalState = updatedStateSlice as T;
      } else if (this.state === null || typeof this.state !== 'object' || Array.isArray(this.state)) {
        finalState = updatedStateSlice as T;
      } else {
        finalState = { ...this.state, ...(updatedStateSlice as Partial<T>) } as T;
      }
  
      const hasChanged = !this.isEqual(oldState, finalState);
      if (!hasChanged) return;
  
      this.state = finalState;  
      [...this.listeners].forEach((listener) => listener(this.state));
    }
  
    protected isEqual(a: any, b: any): boolean {
      if (a === b) return true;
  
      if (typeof a !== typeof b || a === null || typeof a !== 'object') {
          return false;
      }
  
      if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }
        return true;
      }
  
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
  
      if (keysA.length !== keysB.length) return false;
  
      for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key) || a[key] !== b[key]) {
          return false;
        }
      }
  
      return true;
    }
  
    public get current(): T {
      return this.state;
    }
  
    public reset(): void {
      const initialState = this.defaultState === null
        ? null
        : typeof this.defaultState === 'object'
        ? (Array.isArray(this.defaultState) ? [...this.defaultState] : { ...this.defaultState })
        : this.defaultState;
      this.set(initialState as T, { replace: true });
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
  
    public use<Selected = T>(selector?: (state: T) => Selected): Selected {
      const state = useSyncExternalStore(
        (onStoreChange) => this.subscribe(onStoreChange),
        () => this.current,
        () => this.defaultState
      );
  
      return selector ? selector(state) : (state as unknown as Selected);
    }
  }