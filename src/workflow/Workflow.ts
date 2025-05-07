import {
  TOOLKIT_DATABASE_CONTENT,
  WORKFLOW_BODY_DATABASE,
  WORKFLOW_DATABASE,
} from "@/assets/const";
import { WorkflowMarketProps } from "@/page/market/WorkflowsMarketTab";
import { ToolkitStore, Toolkit } from "@/toolkit/Toolkit";
import { AgentManager } from "@/store/AgentManager";
import { gen } from "@/utils/generator";
import { supabase } from "@/utils/supabase";
import { Echo, Echoa } from "echo-state";
import { Scheduler } from "../page/schedule/Scheduler";
import {
  AgentNodeConfig,
  INITIAL_WORKFLOW,
  NodeResult,
  PluginNodeConfig,
  WorkflowBody,
  WorkflowMeta,
  WorkflowNode,
} from "../page/workflow/types/nodes";
import { WorkflowExecutor } from "./execute/WorkflowExecutor";

/* 工作流列表 */
export const WorkflowsStore = new Echo<Record<string, WorkflowMeta>>(
  {},
).indexed({
  database: WORKFLOW_DATABASE,
  name: WORKFLOW_DATABASE,
});

/* 工作流类 */
export class Workflow {
  /* 工作流元数据 */
  meta: WorkflowMeta;
  /* 工作流执行器 */
  executor: WorkflowExecutor;

  /* 关闭工作流 */
  async close() {
    this.executor = new WorkflowExecutor(this);
  }

  /* 获取工作流 */
  static async get(id: string) {
    const workflows = await WorkflowsStore.getCurrent();
    return new Workflow(workflows[id]);
  }

  /* 创建工作流 */
  static async create(): Promise<Workflow> {
    const id = gen.id();
    const now = Date.now();
    const workflow = new Workflow({
      ...INITIAL_WORKFLOW,
      id,
      createdAt: now,
      updatedAt: now,
    });
    WorkflowsStore.set({
      [id]: workflow.meta,
    });
    return workflow;
  }

  /* 创建工作流实例 */
  constructor(meta: Partial<WorkflowMeta> = {}) {
    this.meta = { ...INITIAL_WORKFLOW, ...meta };
    this.executor = new WorkflowExecutor(this);
  }

  /* 更新工作流 */
  async updateMeta(workflow: Partial<Omit<WorkflowMeta, "id">>) {
    const now = Date.now();
    this.meta = {
      ...this.meta,
      ...workflow,
      updatedAt: now,
    };
    WorkflowsStore.set({
      [this.meta.id]: this.meta,
    });
    return this;
  }

  async getBody() {
    return Echo.get<WorkflowBody>({
      database: WORKFLOW_BODY_DATABASE,
      name: this.meta.id,
    }).getCurrent();
  }

  static async delete(id: string) {
    const workflow = WorkflowsStore.current[id];
    if (workflow) {
      // 如果工作流有定时任务，需要先取消
      Scheduler.cancel(id);
      WorkflowsStore.delete(id);
      await Echo.get({
        database: WORKFLOW_DATABASE,
        name: id,
      }).discard();
    }
  }

  /* 执行工作流 */
  public async execute(inputs?: Record<string, any>): Promise<NodeResult> {
    try {
      const result = await this.executor.execute(inputs);
      console.log("result", result);
      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async uploadToMarket() {
    const { data } = await supabase
      .from("workflows")
      .select("id")
      .eq("id", this.meta.id);
    if (data && data.length > 0) {
      throw new Error("key already exists");
    }

    const workflowData = await this.getBody();
    const processedPlugins = new Set<string>();
    const processedAgents = new Set<string>();

    for (const node of Object.values(workflowData.nodes) as WorkflowNode[]) {
      if (node.type === "plugin") {
        const pluginConfig = node.data as PluginNodeConfig;
        const pluginId = pluginConfig.plugin;

        if (!processedPlugins.has(pluginId)) {
          try {
            const plugin = await Toolkit.get(pluginId);
            const content = await Echo.get<string>({
              database: TOOLKIT_DATABASE_CONTENT,
              name: pluginId,
            }).getCurrent();

            // 尝试上传插件，如果失败则检查是否是因为已存在
            try {
              await plugin.uploadToMarket(content);
              console.log(`插件 ${pluginId} 上传成功`);
            } catch (uploadError) {
              // 如果是已存在的错误，则忽略并继续
              console.log(`插件 ${pluginId} 已存在或上传失败，继续执行...`);
            }

            processedPlugins.add(pluginId);
          } catch (error) {
            console.log(`获取插件 ${pluginId} 失败，继续执行...`, error);
          }
        }
      }

      if (node.type === "agent") {
        const agentConfig = node.data as AgentNodeConfig;
        const agentId = agentConfig.agent;

        if (!processedAgents.has(agentId)) {
          try {
            const agent = await AgentManager.getById(agentId);

            // 尝试上传代理，如果失败则检查是否是因为已存在
            try {
              await AgentManager.uploadToMarket(agent.infos);
              console.log(`代理 ${agentId} 上传成功`);
            } catch (uploadError) {
              // 如果是已存在的错误，则忽略并继续
              console.log(`代理 ${agentId} 已存在或上传失败，继续执行...`);
            }

            processedAgents.add(agentId);
          } catch (error) {
            console.log(`获取代理 ${agentId} 失败，继续执行...`, error);
          }
        }
      }
    }

    // 最后上传工作流本身
    try {
      const { error } = await supabase.from("workflows").insert({
        id: this.meta.id,
        name: this.meta.name,
        description: this.meta.description,
        body: workflowData,
      });

      console.log(error);

      if (error) throw error;
      console.log(`工作流 ${this.meta.id} 上传成功`);
    } catch (error) {
      throw new Error(`上传工作流失败: ${error}`);
    }
  }
  static async installFromMarket(workflow: WorkflowMarketProps) {
    const wf = new Workflow({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
    });
    WorkflowsStore.set({
      [workflow.id]: wf.meta,
    });

    console.log(workflow.body);

    // 解析工作流主体数据
    if (workflow.body) {
      const workflowData =
        typeof workflow.body === "string"
          ? JSON.parse(workflow.body)
          : workflow.body;

      // 存储需要安装的插件和代理ID
      const pluginsToInstall = new Set<string>();
      const agentsToInstall = new Set<string>();

      // 获取现有的插件和代理，用于检查是否已安装
      const existingPlugins = await ToolkitStore.getCurrent();
      const existingAgents = await AgentManager.list.getCurrent();

      // 处理所有节点，检查是否需要安装插件和代理
      for (const node of Object.values(
        workflowData.nodes || {},
      ) as WorkflowNode[]) {
        // 检查插件节点
        if (node.type === "plugin") {
          const pluginConfig = node.data as PluginNodeConfig;
          const pluginId = pluginConfig.plugin;

          // 如果插件不存在，需要安装
          if (pluginId && !existingPlugins[pluginId]) {
            pluginsToInstall.add(pluginId);
          }
        }

        // 检查代理节点
        if (node.type === "agent") {
          const agentConfig = node.data as AgentNodeConfig;
          const agentId = agentConfig.agent;

          // 如果代理不存在，需要安装
          if (agentId && !existingAgents[agentId]) {
            agentsToInstall.add(agentId);
          }
        }
      }

      // 安装缺失的插件
      for (const pluginId of pluginsToInstall) {
        try {
          // 从市场获取插件数据
          const { data, error } = await supabase
            .from("plugins")
            .select("*")
            .eq("id", pluginId)
            .single();

          if (error) {
            console.error(`获取插件 ${pluginId} 失败:`, error);
            continue;
          }

          if (data) {
            // 安装插件
            await Toolkit.installFromMarket(data);
            console.log(`成功安装插件: ${data.name}`);
          }
        } catch (error) {
          console.error(`安装插件 ${pluginId} 失败:`, error);
        }
      }

      // 安装缺失的代理
      for (const agentId of agentsToInstall) {
        try {
          // 从市场获取代理数据
          const { data, error } = await supabase
            .from("agents")
            .select("*")
            .eq("id", agentId)
            .single();

          if (error) {
            console.error(`获取代理 ${agentId} 失败:`, error);
            continue;
          }

          if (data) {
            // 安装代理
            await AgentManager.installFromMarket(data);
            console.log(`成功安装代理: ${data.name}`);
          }
        } catch (error) {
          console.error(`安装代理 ${agentId} 失败:`, error);
        }
      }

      console.log(workflowData);

      // 最后更新工作流数据
      await new Echo(workflowData)
        .indexed({
          database: WORKFLOW_BODY_DATABASE,
          name: wf.meta.id,
        })
        .ready(workflowData, { replace: true });
    }

    return wf;
  }
  static async uninstallFromMarket(id: string) {
    const { error } = await supabase.from("workflows").delete().eq("id", id);

    if (error) {
      throw error;
    }
  }
  static async fetchFromMarket(page: number, itemsPerPage: number) {
    // 获取当前页数据
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .order("inserted_at", { ascending: false })
      .range(start, end);

    if (error) {
      throw error;
    }
    return (data as WorkflowMarketProps[]) || [];
  }
}
/* 当前工作流 */
export const CurrentWorkflow = new Echoa<Workflow>(new Workflow());
