import { contextBridge, ipcRenderer } from "electron";
import {
    InvokeChannels,
    InvokeParamsMap,
    InvokeReturnMap,
    OnChannels,
    OnCallbackParamsMap,
    SendChannels,
    SendParamsMap,
    validChannels
} from "../common/types/channels";

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
    invoke: <C extends InvokeChannels>(
        channel: C,
        ...args: InvokeParamsMap[C]
    ): Promise<InvokeReturnMap[C]> => {
        if (!validChannels.invoke.includes(channel)) {
            throw new Error(`非法的invoke通道: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    },

    /**
     * 发送消息到主进程
     * @param channel IPC 通道名称
     * @param args 发送参数
     */
    send: <C extends SendChannels>(channel: C, ...args: SendParamsMap[C]): void => {
        if (!validChannels.send.includes(channel)) {
            throw new Error(`非法的send通道: ${channel}`);
        }
        ipcRenderer.send(channel, ...args);
    },

    /**
     * 监听主进程消息
     * @param channel IPC 通道名称
     * @param callback 回调函数
     * @returns 取消监听的函数
     */
    on: <C extends OnChannels>(channel: C, callback: (...args: OnCallbackParamsMap[C]) => void) => {
        if (!validChannels.on.includes(channel)) {
            throw new Error(`非法的on通道: ${channel}`);
        }
        const subscription = (_event: any, ...args: OnCallbackParamsMap[C]) => callback(...args);
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
    once: <C extends OnChannels>(
        channel: C,
        callback: (...args: OnCallbackParamsMap[C]) => void
    ) => {
        if (!validChannels.on.includes(channel)) {
            throw new Error(`非法的once通道: ${channel}`);
        }
        ipcRenderer.once(channel, (_event, ...args: OnCallbackParamsMap[C]) => callback(...args));
    }
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