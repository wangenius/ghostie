/**
 * 模型提供商索引文件
 * 所有模型提供商应该在这里导入并注册
 */

// 导入所有模型提供商
import "./OpenAI";
import "./Tongyi";
import "./Claude";
import "./Deepseek";
import "./Doubao";
import "./Zhipu";
import "./SiliconFlow";
import "./Gemini";
import "./Moonshot";
import "./Hunyuan";

// 为了避免循环依赖，不要在这里导出任何内容
// 在应用程序的入口文件中导入这个文件来确保所有模型提供商都已注册

/**
 * 如何添加新的模型提供商:
 *
 * 1. 创建新的模型提供商文件，例如 Claude.ts
 * 2. 实现 ModelProvider 接口
 * 3. 在该文件中注册提供商
 * 4. 在此文件中导入该提供商
 *
 * 示例:
 *
 * ```typescript
 * // src/model/llm/Claude.ts
 * import { ChatModel, ModelProvider } from "../ChatModel";
 * import { ... } from "...";
 *
 * export class Claude extends ChatModel {
 *   constructor(config?) {
 *     super(config);
 *   }
 *
 *   public async stream(...): Promise<...> {
 *     // 实现流式生成方法
 *   }
 * }
 *
 * // 注册Claude提供商
 * const ClaudeProvider: ModelProvider = {
 *   name: "Claude",
 *   description: "Anthropic Claude (Claude 3)",
 *   models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
 *   create: (config) => new Claude(config),
 * };
 *
 * // 注册到ChatModel
 * ChatModel.registerProvider(ClaudeProvider);
 * ```
 */
