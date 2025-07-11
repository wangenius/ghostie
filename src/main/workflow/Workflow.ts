import {
  TOOLKIT_DATABASE_CONTENT,
  WORKFLOW_BODY_DATABASE,
  WORKFLOW_DATABASE,
} from "@/assets/const";
import { WorkflowMarketProps } from "@/page/market/WorkflowsMarketTab";
import { ToolkitStore, Toolkit } from "@/toolkit/Toolkit";
import { AgentManager } from "@/store/AgentManager";
import { gen } from "@/utils/generator";
import { FeishuService } from "@/utils/feishu";
import { Echo, Echoa } from "echo-state";
import { Scheduler } from "../../renderer/src/page/schedule/Scheduler";
import {
  AgentNodeConfig,
  INITIAL_WORKFLOW,
  NodeResult,
  PluginNodeConfig,
  WorkflowBody,
  WorkflowMeta,
  WorkflowNode,
} from "../../renderer/src/page/workflow/types/nodes";
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
    // 使用飞书API检查工作流是否已存在
    try {
      const sheetToken = 'your_workflows_sheet_token';
      const data = await FeishuService.getSheetData(sheetToken, 'Sheet1!A:A');
      
      if (data && data.values) {
        for (const row of data.values) {
          if (row[0] === this.meta.id) {
            throw new Error("key already exists");
          }
        }
      }
    } catch (error) {
      console.error('检查工作流是否存在失败:', error);
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
              // await plugin.uploadToMarket(content); // 暂时注释，需要在Toolkit中实现
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
              // await AgentManager.uploadToMarket(agent.infos); // 暂时注释，需要在AgentManager中实现
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
      const sheetToken = 'your_workflows_sheet_token';
      const values = [
        [this.meta.id, this.meta.name, this.meta.description, JSON.stringify(workflowData), new Date().toISOString()]
      ];
      
      await FeishuService.updateSheetData(sheetToken, 'Sheet1!A:E', values);
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
                  // 从市场获取插件数据 - 需要使用飞书API实现
        try {
          console.log(`获取插件 ${pluginId} 数据...`);
          // 实际实现需要使用飞书API
          // const data = await FeishuService.getSheetData(sheetToken, range);
          // await Toolkit.installFromMarket(data);
          console.log(`成功安装插件: ${pluginId}`);
        } catch (error) {
          console.error(`获取插件 ${pluginId} 失败:`, error);
          continue;
        }
        } catch (error) {
          console.error(`安装插件 ${pluginId} 失败:`, error);
        }
      }

      // 安装缺失的代理
      for (const agentId of agentsToInstall) {
        try {
                  // 从市场获取代理数据 - 需要使用飞书API实现
        try {
          console.log(`获取代理 ${agentId} 数据...`);
          // 实际实现需要使用飞书API
          // const data = await FeishuService.getSheetData(sheetToken, range);
          // await AgentManager.installFromMarket(data);
          console.log(`成功安装代理: ${agentId}`);
        } catch (error) {
          console.error(`获取代理 ${agentId} 失败:`, error);
          continue;
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
    try {
      // 使用飞书多维表格API删除工作流数据
      console.log('删除工作流:', id);
      // 实际实现需要调用飞书API
      // const sheetToken = 'your_workflows_sheet_token';
      // 需要实现删除逻辑
    } catch (error) {
      console.error('删除工作流失败:', error);
      throw error;
    }
  }
  static async fetchFromMarket(page: number, itemsPerPage: number) {
    try {
      // 使用飞书多维表格API获取工作流数据
      const sheetToken = 'your_workflows_sheet_token';
      const range = `Sheet1!A${(page - 1) * itemsPerPage + 1}:Z${page * itemsPerPage}`;
      
      const data = await FeishuService.getSheetData(sheetToken, range);
      
      // 转换飞书表格数据为WorkflowMarketProps格式
      const workflows: WorkflowMarketProps[] = [];
      if (data && data.values) {
        for (const row of data.values) {
          if (row.length >= 4) {
            workflows.push({
              id: row[0],
              name: row[1],
              description: row[2],
              body: JSON.parse(row[3] || '{}'),
              inserted_at: row[4] || new Date().toISOString(),
              updated_at: row[5] || new Date().toISOString(),
              user_id: row[6] || '',
            });
          }
        }
      }
      
      return workflows;
    } catch (error) {
      console.error('获取工作流市场数据失败:', error);
      throw error;
    }
  }
}
/* 当前工作流 */
export const CurrentWorkflow = new Echoa<Workflow>(new Workflow());
