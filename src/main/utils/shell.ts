/**
 * Main进程的shell工具
 * 注意：这个文件是临时解决方案，main进程中不应该使用cmd.invoke
 * 应该直接调用相应的功能而不是通过IPC通信
 */

export abstract class cmd {
  /**
   * 在main进程中，不应该使用invoke方法
   * 这是一个临时的占位符实现
   */
  static async invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
    console.warn(`警告：在main进程中调用cmd.invoke('${channel}')是不合适的架构设计`);
    console.warn('main进程应该直接调用相应的功能，而不是通过IPC通信');
    throw new Error(`main进程中不应该使用cmd.invoke('${channel}')`);
  }

  /**
   * 在main进程中，不应该使用listen方法
   * 这是一个临时的占位符实现
   */
  static async listen(
    channel: string,
    callback: (message: { event: string; payload: string; id: number }) => void,
  ): Promise<() => void> {
    console.warn(`警告：在main进程中调用cmd.listen('${channel}')是不合适的架构设计`);
    console.warn('main进程应该直接处理事件，而不是通过IPC通信');
    
    // 返回一个空的清理函数
    return () => {};
  }
} 