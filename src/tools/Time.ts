import { tool } from "@/services/tool/Tool";

export class Time {
  constructor() {
    // 构造函数中不需要特殊处理，装饰器会自动注册
    console.log("Time 工具类已初始化");
  }

  @tool("获取当前时间", {})
  static getCurrentTime(): string {
    return new Date().toLocaleString();
  }

  @tool("格式化日期", {
    date: {
      type: "string",
      description: "要格式化的日期字符串",
      required: true,
    },
    format: {
      type: "string",
      description: "日期格式 (如: YYYY-MM-DD)",
      required: false,
    },
  })
  static formatDate(args: { date: string; format?: string }): string {
    const date = new Date(args.date);
    if (args.format) {
      // 这里可以实现更复杂的格式化逻辑
      return date.toLocaleDateString();
    }
    return date.toISOString();
  }
}
