import { BotProps } from "@/common/types/bot";
import { ToolFunctionInfo } from "@/common/types/model";
import { Echo } from "echo-state";
import { Context } from "../agent/Context";
import { ChatModel } from "../model/ChatModel";
import { Tool } from "../tool/Tool";
import { ModelManager } from "../model/ModelManager";

/*  */
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
    const model = ModelManager.get(config.model);
    this.model = new ChatModel(model)
      .setTools(Tool.get(config.tools))
      .system(config.system);
    this.tools = Tool.get(config.tools);
    this.context = new Context();
  }

  public async chat(input: string) {
    /* 重置上下文 */
    this.context.reset();
    this.loading.set({ status: true });
    await this.model.text(`${input} 请思考后回答,可调用相关工具`);
    // 生成最终响应
    const prompt = `请生成简约回应`;
    await this.model.stream(prompt);
    this.loading.set({ status: false });
  }
}
