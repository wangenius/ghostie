import { Echo } from "echo-state";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { confirm, message } from '@tauri-apps/plugin-dialog';

export const download_state = new Echo<{ current: any; checking: boolean; downloading: boolean }>(
    {
        current: null,
        checking: false,
        downloading: false
    },
    {
        name: "download_state",
    }
);

/** @Description base method abstract */
export abstract class cmd {
    /**
     * 运行主进程中的方法
     * @param channel - 通信频道名称, rust 中定义的名称
     * @param args - 传递给主进程的参数
     * @returns 返回主进程执行结果
     */
    static async invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
        return await invoke(channel, ...args);
    }


    /** @Description 监听事件 */
    static async listen(channel: string, callback: (event: any) => void) {
        return await listen(channel, callback);
    }


    static async open(name: string, query: Record<string, any>, config?: {
        width?: number;
        height?: number;
    }) {
        return await cmd.invoke("open_window", {
            name,
            query: query || null,
            config: config ? {
                width: config.width || 0,
                height: config.height || 0
            } : null
        });
    }




    /** @Description 关闭App */

    static async close() {
        await cmd.invoke("hide_window");
    }


    /** @Description confirm cancel throw and return rest value */
    static async confirm(msg: string) {
        return await confirm(msg, {
            title: "echo",
            kind: "info",
        });

    }

    static async message(msg: string, title: string = "信息", kind: "info" | "warning" | "error" = "info") {
        return await message(msg, {
            title,
            kind
        });
    }
}   
