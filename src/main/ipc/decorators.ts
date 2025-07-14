import { ipcMain } from "electron";

// 存储所有注册的 IPC 处理器
const ipcHandlers = new Map<
  string,
  { target: any; method: string; channel: string }
>();

const registeredInstances = new WeakSet<any>();

/**
 * IPC 处理器装饰器
 * @param channel IPC 通道名称
 */
export function IpcHandle(channel: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // 存储处理器信息
    ipcHandlers.set(channel, {
      target: target.constructor,
      method: propertyKey,
      channel: channel,
    });

    return descriptor;
  };
}

/**
 * 注册所有 IPC 处理器
 * @param instance 实例对象
 */
export function registerIpcHandlers(instance: any) {
  // 避免重复注册同一个实例
  if (registeredInstances.has(instance)) {
    return;
  }

  for (const [channel, handler] of ipcHandlers) {
    if (instance instanceof handler.target) {
      const method = instance[handler.method];
      if (typeof method === "function") {
        // 先移除可能存在的旧处理器
        ipcMain.removeHandler(channel);

        // 注册新的处理器
        ipcMain.handle(channel, async (_, ...args) => {
          try {
            return await method.call(instance, ...args);
          } catch (error) {
            console.error(`IPC 处理器 ${channel} 执行失败:`, error);
            throw error;
          }
        });
        console.log(`已注册 IPC 处理器: ${channel}`);
      }
    }
  }

  // 标记实例为已注册
  registeredInstances.add(instance);
}
