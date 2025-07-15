import { contextBridge, ipcRenderer } from "electron";

/**
 * 安全的 IPC 通信接口
 * 提供类型安全的 IPC 调用方法
 */
const secureIPC = {
  /**
   * 调用主进程方法
   * @param channel IPC 通道名称
   * @param args 调用参数
   * @returns Promise<T> 调用结果
   */
  invoke: <C extends string>(channel: C, ...args: any[]): Promise<any> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * 发送消息到主进程
   * @param channel IPC 通道名称
   * @param args 发送参数
   */
  send: <C extends string>(channel: C, ...args: any): void => {
    ipcRenderer.send(channel, ...args);
  },

  /**
   * 监听主进程消息
   * @param channel IPC 通道名称
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  on: <C extends string>(channel: C, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  /**
   * 监听主进程消息（一次性）
   * @param channel IPC 通道名称
   * @param callback 回调函数
   */
  once: <C extends string>(channel: C, callback: (...args: any[]) => void) => {
    ipcRenderer.once(channel, (_event, ...args: any[]) => callback(...args));
  },
};

/**
 * 将安全的 IPC 接口暴露到渲染进程
 */
contextBridge.exposeInMainWorld("shell", secureIPC);

/**
 * 全局类型声明
 */
declare global {
  interface Window {
    shell: typeof secureIPC;
  }
}
