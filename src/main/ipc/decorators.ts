/**
 * IPC 装饰器模块
 * 
 * 提供基于装饰器的 IPC 通信处理器注册机制，简化 Electron 主进程与渲染进程之间的通信。
 * 
 * 主要功能：
 * - @IpcHandle 装饰器：用于标记需要注册为 IPC 处理器的方法
 * - @IpcSend 装饰器：用于标记需要向渲染进程发送消息的方法
 * - registerIpcHandlers：批量注册实例中所有标记的 IPC 处理器
 * - registerIpcSenders：批量注册实例中所有标记的 IPC 发送器
 * 
 * 使用示例：
 * ```typescript
 * class MyService {
 *   @IpcHandle('get-user-info')
 *   async getUserInfo(userId: string) {
 *     return { id: userId, name: 'John' };
 *   }
 * 
 *   @IpcSend('user-status-changed')
 *   notifyUserStatusChanged(status: string) {
 *     return { status, timestamp: Date.now() };
 *   }
 * }
 * 
 * const service = new MyService();
 * registerIpcHandlers(service);
 * registerIpcSenders(service);
 * ```
 * 
 * @author Ghostie Team
 * @since 1.0.0
 */

import { ipcMain, BrowserWindow } from "electron";

/**
 * IPC 处理器信息接口
 */
interface IpcHandlerInfo {
  /** 目标类构造函数 */
  target: any;
  /** 方法名称 */
  method: string;
  /** IPC 通道名称 */
  channel: string;
}

/**
 * IPC 发送器信息接口
 */
interface IpcSenderInfo {
  /** 目标类构造函数 */
  target: any;
  /** 方法名称 */
  method: string;
  /** IPC 通道名称 */
  channel: string;
}

/**
 * 存储所有注册的 IPC 处理器映射
 * Key: IPC 通道名称
 * Value: 处理器信息
 */
const ipcHandlers = new Map<string, IpcHandlerInfo>();

/**
 * 存储所有注册的 IPC 发送器映射
 * Key: IPC 通道名称
 * Value: 发送器信息
 */
const ipcSenders = new Map<string, IpcSenderInfo>();

/**
 * 已注册实例的弱引用集合，用于避免重复注册
 */
const registeredInstances = new WeakSet<any>();

/**
 * IPC 处理器装饰器
 * 
 * 用于标记类方法作为 IPC 处理器，被标记的方法将在调用 registerIpcHandlers 时
 * 自动注册到 Electron 的 ipcMain 中。
 * 
 * @param channel - IPC 通道名称，必须在整个应用中唯一
 * 
 * @example
 * ```typescript
 * class UserService {
 *   @IpcHandle('user:get')
 *   async getUser(id: string) {
 *     return await this.userRepository.findById(id);
 *   }
 * 
 *   @IpcHandle('user:create')
 *   async createUser(userData: CreateUserDto) {
 *     return await this.userRepository.create(userData);
 *   }
 * }
 * ```
 * 
 * @returns 方法装饰器函数
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
 * 注册实例中所有标记了 @IpcHandle 装饰器的方法为 IPC 处理器
 * 
 * 该函数会遍历实例类中所有使用 @IpcHandle 装饰器标记的方法，
 * 并将它们注册到 Electron 的 ipcMain 中。支持异步方法和错误处理。
 * 
 * 特性：
 * - 自动错误处理和日志记录
 * - 防止重复注册同一实例
 * - 支持异步方法
 * - 自动移除旧的处理器避免冲突
 * 
 * @param instance - 包含 IPC 处理器方法的类实例
 * 
 * @example
 * ```typescript
 * const userService = new UserService();
 * const configService = new ConfigService();
 * 
 * // 注册所有服务的 IPC 处理器
 * registerIpcHandlers(userService);
 * registerIpcHandlers(configService);
 * ```
 * 
 * @throws 如果处理器方法执行时发生错误，会在控制台记录错误并重新抛出
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

/**
 * IPC 发送器装饰器
 * 
 * 用于标记类方法作为 IPC 发送器，被标记的方法将在调用 registerIpcSenders 时
 * 自动注册，并可以向所有渲染进程发送消息。
 * 
 * @param channel - IPC 通道名称，必须在整个应用中唯一
 * 
 * @example
 * ```typescript
 * class NotificationService {
 *   @IpcSend('notification:show')
 *   showNotification(message: string, type: 'info' | 'warning' | 'error') {
 *     return { message, type, timestamp: Date.now() };
 *   }
 * 
 *   @IpcSend('user:status-changed')
 *   notifyUserStatusChanged(userId: string, status: string) {
 *     return { userId, status };
 *   }
 * }
 * ```
 * 
 * @returns 方法装饰器函数
 */
export function IpcSend(channel: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // 存储发送器信息
    ipcSenders.set(channel, {
      target: target.constructor,
      method: propertyKey,
      channel: channel,
    });

    return descriptor;
  };
}

/**
 * 注册实例中所有标记了 @IpcSend 装饰器的方法为 IPC 发送器
 * 
 * 该函数会遍历实例类中所有使用 @IpcSend 装饰器标记的方法，
 * 并为每个方法创建一个包装函数，该包装函数会向所有渲染进程发送消息。
 * 
 * 特性：
 * - 自动向所有渲染进程广播消息
 * - 支持异步方法和错误处理
 * - 防止重复注册同一实例
 * - 自动日志记录
 * 
 * @param instance - 包含 IPC 发送器方法的类实例
 * 
 * @example
 * ```typescript
 * const notificationService = new NotificationService();
 * const userService = new UserService();
 * 
 * // 注册所有服务的 IPC 发送器
 * registerIpcSenders(notificationService);
 * registerIpcSenders(userService);
 * 
 * // 现在可以调用方法来发送消息到渲染进程
 * notificationService.showNotification('Hello World', 'info');
 * ```
 * 
 * @throws 如果发送器方法执行时发生错误，会在控制台记录错误
 */
export function registerIpcSenders(instance: any) {
  // 避免重复注册同一个实例
  if (registeredInstances.has(instance)) {
    return;
  }

  for (const [channel, sender] of ipcSenders) {
    if (instance instanceof sender.target) {
      const originalMethod = instance[sender.method];
      if (typeof originalMethod === "function") {
        // 包装原方法，添加发送功能
        instance[sender.method] = async function (...args: any[]) {
          try {
            // 执行原方法获取数据
            const result = await originalMethod.call(this, ...args);
            
            // 向所有渲染进程发送消息
            const allWindows = BrowserWindow.getAllWindows();
            for (const window of allWindows) {
              if (!window.isDestroyed() && window.webContents) {
                window.webContents.send(channel, result);
              }
            }
            
            console.log(`已发送 IPC 消息: ${channel}`);
            return result;
          } catch (error) {
            console.error(`IPC 发送器 ${channel} 执行失败:`, error);
            throw error;
          }
        };
      }
    }
  }

  // 标记实例为已注册（复用同一个 WeakSet）
  registeredInstances.add(instance);
}
