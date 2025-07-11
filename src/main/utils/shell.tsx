import { dialog } from "@/components/custom/DialogModal";
import { invoke, windowApi } from "./electron-adapter";
import { validChannels } from "@common/types/channels";

export abstract class cmd {
  /**
   * 运行主进程中的方法
   * @param channel - 通信频道名称
   * @param args - 传递给主进程的参数
   * @returns 返回主进程执行结果
   */
  static async invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
    // 验证通道名称是否合法
    if (!validChannels.invoke.includes(channel as any)) {
      throw new Error(`非法的invoke通道: ${channel}，请检查通道名称是否使用了连字符(-)而不是下划线(_)`);
    }
    return await invoke(channel, ...args);
  }

  /** @Description 监听事件 */
  static async listen(
    channel: string,
    callback: (message: { event: string; payload: string; id: number }) => void,
  ) {
    // 验证通道名称是否合法
    if (!validChannels.on.includes(channel as any)) {
      throw new Error(`非法的监听通道: ${channel}`);
    }
    return (window as any).shell.on(channel, callback);
  }

  static async open(
    name: string,
    query: Record<string, any>,
    config?: {
      width?: number;
      height?: number;
    },
  ) {
    return await cmd.invoke("open-window", {
      name,
      query: query || null,
      config: config
        ? {
            width: config.width || 0,
            height: config.height || 0,
          }
        : null,
    });
  }

  /** @Description 关闭App */
  static async close() {
    await cmd.invoke("hide-window");
  }

  /** @Description confirm cancel throw and return rest value */
  static async confirm(msg: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.confirm({
        title: "提示",
        content: msg,
        onCancel: () => {
          resolve(false);
        },
        onOk: () => {
          resolve(true);
        },
      });
    });
  }

  static async message(
    msg: string,
    title: string = "信息",
    kind: "info" | "warning" | "error" = "info",
  ) {
    await windowApi.notify({ msg, title, kind });
  }

  static async notify(msg: string): Promise<boolean> {
    await windowApi.notify({ msg });
    return true;
  }
}
