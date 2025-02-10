import { BotProps } from "@/common/types/bot";
import { ToolFunctionInfo } from "@/common/types/model";
import { Echo } from "echo-state";
import { Context } from "../agent/Context";
import { ChatModel } from "../model/ChatModel";
import { Tool } from "../tool/Tool";

export class Bot {
  name: string;
  system: string;
  model: ChatModel;
  tools: ToolFunctionInfo[];
  context: Context;

  /** 加载状态 */
  loading = new Echo<{ status: boolean }>({
    status: false,
  });

  constructor(config: BotProps) {
    this.name = config.name;
    this.system = config.system;
    this.model = new ChatModel()
      .setTools(Tool.get(config.tools))
      .system(config.system);
    this.tools = Tool.get(config.tools);
    this.context = new Context();
  }

  public async chat(input: string) {
    /* 重置上下文 */
    this.context.reset();
    this.loading.set({ status: true });
    await this.model.stream(input);
    this.loading.set({ status: false });
  }
}
