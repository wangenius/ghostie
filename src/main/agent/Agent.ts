import {
  AgentChatOptions,
  AgentInfos,
  DEFAULT_AGENT,
  ExecuteOptions,
} from "./types/agent";
import { gen } from "../utils/generator";
import { Context } from "./context/Context";
import { AgentManager } from "../store/AgentManager";
import { IpcHandle, registerIpcHandlers, unregisterIpcHandlers } from "../ipc/decorators";
import { AISdkChatModel } from "../model/chat/AISdkChatModel";
import { ChatModelManager } from "../model/chat/ChatModelManager";
import { ToolsHandler } from "../model/chat/ToolsHandler";
import { MessageItem } from "../../common/types/chatModel";

/** Agent类 */
export class Agent {
  /* 配置信息 */
  infos: AgentInfos;
  /* 模型 */
  protected model!: AISdkChatModel;
  /* 上下文 */
  context: Context;
  /* 初始化完成标志 */
  protected isInitialized: boolean = false;
  /* 初始化Promise */
  protected initPromise: Promise<void> | null = null;

  /** 构造函数 */
  protected constructor(infos: AgentInfos) {
    this.infos = infos;
    this.context = Context.create(this);
    
    // 初始化模型
    this.initializeModel();
    
    // 开始初始化
    this.initPromise = this.init().then(() => {
      this.isInitialized = true;
    });
    
    // 自动注册 IPC 处理器
    registerIpcHandlers(this);
  }

  /** 初始化模型 */
  protected initializeModel() {
    console.log('初始化模型配置:', this.infos.models);
    
    // 检查是否有文本模型配置
    const textModel = this.infos.models?.text;
    if (!textModel) {
      console.warn('没有配置文本模型，使用默认配置');
      // 使用默认配置
      this.model = AISdkChatModel.create({
        provider: "OpenAI",
        model: "gpt-4o-mini",
        apiKey: ChatModelManager.getApiKey("OpenAI") || "",
        baseURL: this.getBaseURLForProvider("OpenAI"),
      });
      return;
    }
    
    // 使用 AI SDK 模型
    try {
      // 从ModelManager获取API密钥
      const apiKey = ChatModelManager.getApiKey(textModel.provider);
      
      console.log(`提供商: ${textModel.provider}, 模型: ${textModel.name}, API密钥存在: ${!!apiKey}`);
      
      if (!apiKey) {
        console.error(`❌ 重要：${textModel.provider} 的API密钥未设置！`);
        console.error(`请在设置页面配置 ${textModel.provider} 的API密钥后再试。`);
        console.error(`当前将使用空API密钥创建模型，这会导致请求失败。`);
      }
      
      // 获取正确的baseURL
      const baseURL = this.getBaseURLForProvider(textModel.provider);
      
      this.model = AISdkChatModel.create({
        provider: textModel.provider,
        model: textModel.name,
        apiKey: apiKey || "",
        baseURL: baseURL,
      });
      
      console.log(`✅ 模型创建成功:`, {
        provider: textModel.provider,
        model: textModel.name,
        baseURL: baseURL,
        hasApiKey: !!apiKey,
      });
      
    } catch (error) {
      console.error('创建AI SDK模型失败:', error);
      // 创建一个默认模型作为回退
      this.model = AISdkChatModel.create({
        provider: "OpenAI",
        model: "gpt-4o-mini",
        apiKey: "",
        baseURL: this.getBaseURLForProvider("OpenAI"),
      });
      console.log('使用默认模型配置');
    }
    
    console.log('最终模型配置:', this.model);
  }

  /** 获取提供商的baseURL */
  private getBaseURLForProvider(provider: string): string | undefined {
    // 根据提供商返回相应的baseURL
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
      case 'claude':
        return 'https://api.anthropic.com/v1';
      case 'deepseek':
        return 'https://api.deepseek.com';
      case 'moonshot':
        return 'https://api.moonshot.cn/v1';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v4';
      case 'tongyi':
        return 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      case 'doubao':
        return 'https://ark.cn-beijing.volces.com/api/v3';
      case 'hunyuan':
        return 'https://api.hunyuan.cloud.tencent.com/v1';
      case 'siliconflow':
        return 'https://api.siliconflow.cn/v1';
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'deerapi':
        return 'https://api.deerapi.com/v1';
      case 'jina':
        return 'https://deepsearch.jina.ai/v1';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1beta/openai';
      default:
        return undefined;
    }
  }

  /** 初始化Agent */
  protected async init() {
    // 设置模型参数
    this.model.setTemperature(this.infos.configs?.temperature || 0.7);
    // AI SDK 工具格式转换
    const tools = await this.generateAISdkTools(this.infos);
    this.model.setTools(tools);
  }

  /** 等待初始化完成 */
  protected async ensureInitialized() {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
  }

  /** 生成工具 */
  protected async generateTools(infos: AgentInfos) {
    const tools = [
      ...(await ToolsHandler.transformAgentToolToModelFormat(infos.tools)),
      ...(await ToolsHandler.transformWorkflowToModelFormat(infos.workflows)),
      ...(await ToolsHandler.transformModelToModelFormat(infos.models)),
      ...(await ToolsHandler.transformAgentToModelFormat(infos.agents)),
      ...(await ToolsHandler.transformMCPToModelFormat(infos.mcps)),
      ...(await ToolsHandler.transformKnowledgeToModelFormat(infos.knowledges)),
      ...(await ToolsHandler.transformSkillToModelFormat(infos.skills)),
    ];
    return tools;
  }

  /** 生成AI SDK工具 */
  protected async generateAISdkTools(infos: AgentInfos) {
    // 为AI SDK格式转换工具
    const tools = await this.generateTools(infos);
    const aiSdkTools: Record<string, any> = {};
    
    for (const tool of tools) {
      if (tool.function) {
        aiSdkTools[tool.function.name] = {
          description: tool.function.description,
          parameters: tool.function.parameters,
        };
      }
    }
    
    return aiSdkTools;
  }

  /** 创建代理或者获取代理 */
  static async create(id?: string): Promise<Agent> {
    /* 创建代理 */
    const agentsList = await AgentManager.getList();
    let infos = agentsList[id || ""];
    if (!infos) {
      infos = { ...DEFAULT_AGENT, id: id || gen.id() };
    }
    
    // 根据engine类型创建相应的Agent子类
    const engineType = infos.engine || "react";
    
    // 动态导入并创建相应的Agent子类
    let agent: Agent;
    
    switch (engineType) {

      case "react":
      default: {
        const { ReactAgent } = await import("./ReactAgent");
        agent = new ReactAgent(infos);
        break;
      }
    }
    
    /* 返回代理 */
    return agent;
  }

  /* 更新机器人元数据 */
  async update(data: Partial<Omit<AgentInfos, "id">>) {
    this.infos = { ...this.infos, ...data };
    /* update之后重新初始化模型和配置 */
    this.initializeModel();
    this.initPromise = this.init().then(() => {
      this.isInitialized = true;
    });
    return this;
  }

  /* 机器人对话 - 基类默认实现，子类需要重写 */
  async chat(input: string, options?: AgentChatOptions): Promise<MessageItem> {
    await this.ensureInitialized();
    throw new Error("chat方法需要在子类中实现");
  }

  /* Agent执行 - 基类默认实现，子类需要重写 */
  async execute(input: string, options?: ExecuteOptions): Promise<MessageItem> {
    console.log(
      `执行 ${input}, images: ${options?.images}, extra: ${options?.extra}`,
    );
    await this.ensureInitialized();
    throw new Error("execute方法需要在子类中实现");
  }

  stop() {
    this.model.stop();
  }

  close() {
    this.model.stop();
    this.context.reset();
    // 取消注册 IPC 处理器
    unregisterIpcHandlers(this);
  }

  // ============ IPC 处理器方法 ============

  /**
   * 获取 Agent 列表
   */
  @IpcHandle("agent-list")
  async getAgentList(): Promise<Record<string, AgentInfos>> {
    try {
      return await AgentManager.getList();
    } catch (error) {
      console.error("获取 Agent 列表失败:", error);
      return {};
    }
  }

  /**
   * 创建新的 Agent
   */
  @IpcHandle("agent-create")
  async createAgent(infos?: Partial<AgentInfos>): Promise<AgentInfos> {
    try {
      const agent = await AgentManager.create(infos);
      return agent.infos;
    } catch (error) {
      console.error("创建 Agent 失败:", error);
      throw new Error(`创建 Agent 失败: ${error}`);
    }
  }

  /**
   * 根据 ID 获取 Agent
   */
  @IpcHandle("agent-get-by-id")
  async getAgentById(id: string): Promise<AgentInfos | null> {
    try {
      const agent = await AgentManager.getById(id);
      return agent ? agent.infos : null;
    } catch (error) {
      console.error("获取 Agent 失败:", error);
      return null;
    }
  }

  /**
   * 更新 Agent 信息
   */
  @IpcHandle("agent-update")
  async updateAgent(id: string, data: Partial<Omit<AgentInfos, "id">>): Promise<void> {
    try {
      await AgentManager.update(id, data);
    } catch (error) {
      console.error("更新 Agent 失败:", error);
      throw new Error(`更新 Agent 失败: ${error}`);
    }
  }

  /**
   * 删除 Agent
   */
  @IpcHandle("agent-delete")
  async deleteAgent(id: string): Promise<void> {
    try {
      await AgentManager.delete(id);
    } catch (error) {
      console.error("删除 Agent 失败:", error);
      throw new Error(`删除 Agent 失败: ${error}`);
    }
  }

  /**
   * Agent 聊天
   */
  @IpcHandle("agent-chat")
  async agentChat(id: string, message: string, options?: any): Promise<any> {
    try {
      const agent = await AgentManager.getById(id);
      if (!agent) {
        throw new Error(`Agent ${id} 不存在`);
      }
      return await agent.chat(message, options);
    } catch (error) {
      console.error("Agent 聊天失败:", error);
      throw new Error(`Agent 聊天失败: ${error}`);
    }
  }

  /**
   * 获取当前 Agent 信息
   */
  @IpcHandle("agent-get-current")
  async getCurrentAgent(): Promise<AgentInfos> {
    return this.infos;
  }

  /**
   * 停止当前 Agent
   */
  @IpcHandle("agent-stop")
  async stopAgent(): Promise<void> {
    this.stop();
  }

  /**
   * 关闭当前 Agent
   */
  @IpcHandle("agent-close")
  async closeAgent(): Promise<void> {
    this.close();
  }

  /**
   * 诊断 Agent 配置问题
   */
  @IpcHandle("agent-diagnose")
  async diagnoseAgent(): Promise<{
    status: 'ok' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // 检查模型配置
      const textModel = this.infos.models?.text;
      if (!textModel) {
        issues.push("未配置文本模型");
        recommendations.push("请在Agent设置中配置文本模型");
      } else {
        // 检查API密钥
        const apiKey = ChatModelManager.getApiKey(textModel.provider);
        if (!apiKey) {
          issues.push(`${textModel.provider} 的API密钥未设置`);
          recommendations.push(`请在模型设置页面配置 ${textModel.provider} 的API密钥`);
        }
        
        // 检查模型是否存在
        const modelConfig = ChatModelManager.getModel({
          provider: textModel.provider,
          name: textModel.name,
        });
        if (!modelConfig) {
          issues.push(`模型 ${textModel.provider}/${textModel.name} 不存在`);
          recommendations.push(`请检查模型配置是否正确`);
        }
      }
      
      // 检查初始化状态
      if (!this.isInitialized) {
        issues.push("Agent 未完成初始化");
        recommendations.push("请等待Agent初始化完成");
      }
      
      // 检查网络连接（简单检查）
      if (textModel) {
        const baseURL = this.getBaseURLForProvider(textModel.provider);
        if (baseURL) {
          try {
            // 简单的网络连接检查
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            await fetch(baseURL.replace('/v1', ''), {
              method: 'HEAD',
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
          } catch (error) {
            issues.push(`无法连接到 ${textModel.provider} 服务器`);
            recommendations.push("请检查网络连接或考虑使用代理");
          }
        }
      }
      
      const status = issues.length === 0 ? 'ok' : 
                    issues.some(issue => issue.includes('API密钥') || issue.includes('不存在')) ? 'error' : 'warning';
      
      return {
        status,
        issues,
        recommendations,
      };
    } catch (error) {
      return {
        status: 'error',
        issues: [`诊断过程出错: ${error}`],
        recommendations: ["请检查Agent配置并重试"],
      };
    }
  }
}
