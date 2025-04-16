import {
  AgentChatOptions,
  AgentMarketProps,
  AgentProps,
} from "@/agent/types/agent";
import { AGENT_DATABASE } from "@/assets/const";
import { MCP, MCPStore } from "@/page/mcp/MCP";
import {
  PLUGIN_DATABASE_CONTENT,
  PluginStore,
  ToolPlugin,
} from "@/plugin/ToolPlugin";
import { ImageManager } from "@/resources/Image";
import { gen } from "@/utils/generator";
import { supabase } from "@/utils/supabase";
import { Workflow, WorkflowsStore } from "@/workflow/Workflow";
import { Echo } from "echo-state";
import { Engine } from "./engine/Engine";

export const DEFAULT_AGENT: AgentProps = {
  id: "",
  name: "",
  system: "",
  tools: [],
  mcps: [],
  engine: "react",
  knowledges: [],
  workflows: [],
};

export const AgentStore = new Echo<Record<string, AgentProps>>({}).indexed({
  database: AGENT_DATABASE,
  name: "index",
});

/** 代理 */
export class Agent {
  /* 代理ID */
  props: AgentProps = DEFAULT_AGENT;
  /* Agent引擎 */
  engine: Engine;
  /** 构造函数 */
  constructor(agent?: Partial<AgentProps>) {
    this.props = { ...DEFAULT_AGENT, ...agent };
    this.engine = Engine.create(this);
  }

  /** 创建代理 */
  static async create(config: Partial<AgentProps> = {}): Promise<Agent> {
    /* 生成ID */
    const id = gen.id();
    /* 创建代理 */
    const agent = new Agent({ ...config, id });
    /* 保存代理 */
    AgentStore.set({
      [id]: agent.props,
    });
    /* 返回代理 */
    return agent;
  }

  static async get(id: string): Promise<Agent> {
    const agent = await AgentStore.getCurrent();
    if (!agent[id]) {
      throw new Error("Agent ID not found");
    }
    return new Agent(agent[id]);
  }

  /* 更新机器人元数据 */
  async update(data: Partial<Omit<AgentProps, "id">>) {
    if (!this.props.id) {
      return this;
    }
    /* 实例 */
    this.props = { ...this.props, ...data };
    /* 更新代理 */
    AgentStore.set({
      [this.props.id]: { ...this.props },
    });
    this.engine = Engine.create(this);
    return this;
  }

  /* 删除机器人 */
  static async delete(id: string) {
    AgentStore.delete(id);
  }

  /* 机器人对话 */
  public async chat(input: string, options?: AgentChatOptions) {
    let content = input;
    let images: string[] = [];
    await Promise.all(
      options?.images?.map(async (image) => {
        const id = gen.id();
        await ImageManager.setImage(
          id,
          `data:${image.contentType};base64,${image.base64Image}`,
        );
        images.push(id);
      }) ?? [],
    );
    return await this.engine.execute(content, {
      images,
      extra: images.length > 0 ? `图片的ID:${images.join(",")}` : "",
    });
  }

  /* 停止机器人 */
  stop() {
    this.engine.stop();
  }

  close() {
    this.engine.close();
    this.props = DEFAULT_AGENT;
  }

  public async uploadToMarket() {
    const { data } = await supabase
      .from("agents")
      .select("id")
      .eq("id", this.props.id);
    if (data && data.length > 0) {
      throw new Error("the id of this agent is already exists");
    }

    // 处理workflows
    const processedWorkflows = new Set<string>();
    for (const workflowId of this.props.workflows || []) {
      if (!processedWorkflows.has(workflowId)) {
        try {
          const workflowInstance = await Workflow.get(workflowId);
          try {
            await workflowInstance.uploadToMarket();
            console.log(`工作流 ${workflowId} 上传成功`);
          } catch (uploadError) {
            console.log(`工作流 ${workflowId} 已存在或上传失败，继续执行...`);
          }
          processedWorkflows.add(workflowId);
        } catch (error) {
          console.log(`获取工作流 ${workflowId} 失败，继续执行...`, error);
        }
      }
    }

    // 处理tools
    const processedTools = new Set<string>();
    for (const tool of this.props.tools || []) {
      if (!processedTools.has(tool.plugin)) {
        try {
          const plugin = await ToolPlugin.get(tool.plugin);
          const content = await Echo.get<string>({
            database: PLUGIN_DATABASE_CONTENT,
            name: tool.plugin,
          }).getCurrent();

          try {
            await plugin.uploadToMarket(content);
            console.log(`插件 ${tool.plugin} 上传成功`);
          } catch (uploadError) {
            console.log(`插件 ${tool.plugin} 已存在或上传失败，继续执行...`);
          }
          processedTools.add(tool.plugin);
        } catch (error) {
          console.log(`获取插件 ${tool.plugin} 失败，继续执行...`, error);
        }
      }
    }

    // 处理mcps
    const processedMcps = new Set<string>();
    for (const mcp of this.props.mcps || []) {
      if (!processedMcps.has(mcp.server)) {
        try {
          const mcpInstance = await MCP.get(mcp.server);
          // MCP目前没有上传到市场的功能,这里先记录日志
          console.log(
            `MCP ${mcp.server} 记录: ${JSON.stringify(mcpInstance.props)}`,
          );
          processedMcps.add(mcp.server);
        } catch (error) {
          console.log(`获取MCP ${mcp.server} 失败，继续执行...`, error);
        }
      }
    }

    // 上传到 Supabase
    const { error } = await supabase.from("agents").insert({
      id: this.props.id,
      name: this.props.name,
      description: this.props.description || this.props.system,
      body: this.props,
    });

    if (error) {
      throw error;
    }
    return;
  }

  static async fetchMarketData(
    page: number = 1,
    limit: number = 10,
  ): Promise<AgentMarketProps[]> {
    // 获取当前页数据
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("inserted_at", { ascending: false })
      .range(start, end);

    if (error) {
      throw error;
    }
    console.log(data);
    return (data as AgentMarketProps[]) || [];
  }

  static async installFromMarket(data: AgentMarketProps) {
    // 获取现有的插件、工作流和MCP,用于检查是否已安装
    const existingPlugins = await PluginStore.getCurrent();
    const existingWorkflows = await WorkflowsStore.getCurrent();
    const existingMCPs = await MCPStore.getCurrent();

    // 存储需要安装的组件ID
    const pluginsToInstall = new Set<string>();
    const workflowsToInstall = new Set<string>();
    const mcpsToInstall = new Set<string>();

    // 检查并收集需要安装的工作流
    for (const workflowId of data.body.workflows || []) {
      if (!existingWorkflows[workflowId]) {
        workflowsToInstall.add(workflowId);
      }
    }

    // 检查并收集需要安装的插件
    for (const tool of data.body.tools || []) {
      if (!existingPlugins[tool.plugin]) {
        pluginsToInstall.add(tool.plugin);
      }
    }

    // 检查并收集需要安装的MCP
    for (const mcp of data.body.mcps || []) {
      if (!existingMCPs[mcp.server]) {
        mcpsToInstall.add(mcp.server);
      }
    }

    // 安装缺失的工作流
    for (const workflowId of workflowsToInstall) {
      try {
        // 从市场获取工作流数据
        const { data: workflowData, error } = await supabase
          .from("workflows")
          .select("*")
          .eq("id", workflowId)
          .single();

        if (error) {
          console.error(`获取工作流 ${workflowId} 失败:`, error);
          continue;
        }

        if (workflowData) {
          // 安装工作流
          await Workflow.installFromMarket(workflowData);
          console.log(`成功安装工作流: ${workflowData.name}`);
        }
      } catch (error) {
        console.error(`安装工作流 ${workflowId} 失败:`, error);
      }
    }

    // 安装缺失的插件
    for (const pluginId of pluginsToInstall) {
      try {
        // 从市场获取插件数据
        const { data: pluginData, error } = await supabase
          .from("plugins")
          .select("*")
          .eq("id", pluginId)
          .single();

        if (error) {
          console.error(`获取插件 ${pluginId} 失败:`, error);
          continue;
        }

        if (pluginData) {
          // 安装插件
          await ToolPlugin.installFromMarket(pluginData);
          console.log(`成功安装插件: ${pluginData.name}`);
        }
      } catch (error) {
        console.error(`安装插件 ${pluginId} 失败:`, error);
      }
    }

    // 安装缺失的MCP
    for (const mcpId of mcpsToInstall) {
      try {
        // 从市场获取MCP数据
        const { data: mcpData, error } = await supabase
          .from("mcps")
          .select("*")
          .eq("id", mcpId)
          .single();

        if (error) {
          console.error(`获取MCP ${mcpId} 失败:`, error);
          continue;
        }

        if (mcpData) {
          // 安装MCP
          // 注意：这里假设MCP有类似的installFromMarket方法
          // 如果没有，需要根据实际情况处理
          await MCP.create(mcpData);
          console.log(`成功安装MCP: ${mcpData.name}`);
        }
      } catch (error) {
        console.error(`安装MCP ${mcpId} 失败:`, error);
      }
    }

    /* 保存代理 */
    AgentStore.set({
      [data.id]: data.body,
    });
    return;
  }

  /* 从市场卸载 */
  static async uninstallFromMarket(id: string) {
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) {
      throw error;
    }
  }
}
