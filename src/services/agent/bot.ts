import { BotProps } from '@/common/types/bot';
import { ChatModel } from '../model/ChatModel';
import { ModelManager } from '../manager/ModelManager';
import { Tool } from '../model/Tool';
import { Context } from './Context';
import { ToolFunctionInfo } from '@/common/types/model';
import { Echo } from 'echo-state';

export class Bot {
  name: string;
  system: string;
  model: ChatModel;
  tools: ToolFunctionInfo[];
  context: Context;
  loading = new Echo<{ status: boolean }>({
    status: false,
  });

  constructor(config: BotProps) {
    this.name = config.name;
    this.system = config.system;

    this.model = new ChatModel(ModelManager.get(config.model)).setTools(
      Tool.get(config.tools)
    );
    this.tools = Tool.get(config.tools);
    this.context = new Context();
  }

  public async *chat(input: string): AsyncGenerator<string> {
    /* 重置上下文 */
    this.context.reset();

    try {
      let currentIteration = 0;
      let finalOutput: any = undefined;
      this.loading.set({ status: true });

      while (currentIteration < 4) {
        /* 思考阶段 */
        const thoughtPrompt = `基于以下信息进行思考:
用户输入: ${input}
当前上下文: ${this.context.generate_context_info()}
可用工具: 
${this.tools.map((tool) => `${tool.name}: ${tool.description}`).join('\n')}



请分析是否需要使用工具来回答用户的问题。`;

        const thought = await this.model.json<{
          needTools: boolean;
          reasoning: string;
        }>(thoughtPrompt, {
          needTools: '是否需要使用工具',
          reasoning: '分析原因',
        });

        /* 行动阶段 */
        if (thought.body.needTools) {
          const action = await this.model.text(
            `基于上述思考，请选择合适的工具执行:
${thought.body.reasoning}`
          );

          if (action.tool) {
            finalOutput = action.tool.result;
            /* 记录到上下文 */
            this.context.recordChain(
              thought.body.reasoning,
              action.tool,
              '工具调用成功'
            );
          }
        } else {
          finalOutput = undefined;
          break;
        }

        if (finalOutput !== undefined) {
          break;
        }

        currentIteration++;
        if (currentIteration >= 4) {
          yield '达到最大迭代次数限制，将直接回答。\n';
          break;
        }
      }

      // 生成最终响应
      const prompt = `请根据以下信息生成回应:
提问: ${input}
${finalOutput ? `工具执行结果: ${JSON.stringify(finalOutput)}` : ''}

请生成一个总结后的完整回应。`;

      const stream = await this.model.stream(prompt);

      for await (const chunk of stream.body) {
        yield chunk;
      }
      this.loading.set({ status: false });
    } catch (error) {
      yield error instanceof Error ? error.message : String(error);
    }
  }
}
