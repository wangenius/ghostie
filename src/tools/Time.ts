import { tool } from "@/services/model/Tool";

export class Time {
  @tool("获取当前时间", {})
  static getCurrentTime(): string {
    return new Date().toLocaleString();
  }
}
