import { Agent } from "../agent/Agent";
import { AgentInfos, DEFAULT_AGENT } from "../agent/types/agent";
import { gen } from "../utils/generator";
import fs from "fs";
import path from "path";
import { app } from "electron";

// 内存存储
let agentsList: Record<string, AgentInfos> = {};
let openedAgents: Record<string, Agent> = {};
let currentOpenedAgent: string = "";
let loadingState: Record<string, boolean> = {};

// 获取数据存储路径
const getDataPath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "agents.json");
};

// 保存到文件
const saveToFile = async () => {
  try {
    const dataPath = getDataPath();
    const dir = path.dirname(dataPath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(agentsList, null, 2));
  } catch (error) {
    console.error("保存 Agent 数据失败:", error);
  }
};

// 从文件加载
const loadFromFile = async () => {
  try {
    const dataPath = getDataPath();
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, "utf-8");
      agentsList = JSON.parse(data);
    }
  } catch (error) {
    console.error("加载 Agent 数据失败:", error);
    agentsList = {};
  }
};

/** Agent管理器 */
export class AgentManager {
  /** 初始化 */
  static async init() {
    await loadFromFile();
  }

  /** 获取所有 Agent 列表 */
  static async getList(): Promise<Record<string, AgentInfos>> {
    return { ...agentsList };
  }

  /** 根据ID获取Agent实例 */
  static async getById(id: string): Promise<Agent | null> {
    try {
      // 先检查是否已经有打开的实例
      const openedAgent = openedAgents[id];
      if (openedAgent) {
        return openedAgent;
      }

      // 检查 Agent 是否存在于列表中
      if (!agentsList[id]) {
        return null;
      }

      // 创建新的Agent实例
      const agent = await Agent.create(id);
      
      // 存储到打开的Agent列表中
      openedAgents[id] = agent;

      return agent;
    } catch (error) {
      console.error("获取Agent失败:", error);
      return null;
    }
  }

  /** 创建新的Agent */
  static async create(infos?: Partial<AgentInfos>): Promise<Agent> {
    const agentId = gen.id();
    const agentInfos: AgentInfos = {
      ...DEFAULT_AGENT,
      id: agentId,
      name: infos?.name || `Agent ${agentId.slice(0, 6)}`,
      ...infos,
    };

    // 保存到列表中
    agentsList[agentId] = agentInfos;
    await saveToFile();

    // 创建Agent实例
    const agent = await Agent.create(agentId);
    
    // 存储到打开的Agent列表中
    openedAgents[agentId] = agent;

    return agent;
  }

  /** 删除Agent */
  static async delete(id: string): Promise<void> {
    // 从列表中删除
    delete agentsList[id];
    await saveToFile();
    
    // 从打开的实例中删除
    if (openedAgents[id]) {
      openedAgents[id].close();
      delete openedAgents[id];
    }
    
    // 如果是当前激活的Agent，清除激活状态
    if (currentOpenedAgent === id) {
      currentOpenedAgent = "";
    }
  }

  /** 更新Agent信息 */
  static async update(id: string, data: Partial<Omit<AgentInfos, "id">>): Promise<void> {
    const currentInfos = agentsList[id];
    if (!currentInfos) {
      throw new Error(`Agent ${id} not found`);
    }

    const updatedInfos = { ...currentInfos, ...data };
    
    // 更新列表中的信息
    agentsList[id] = updatedInfos;
    await saveToFile();

    // 如果有打开的实例，也更新实例
    const openedAgent = openedAgents[id];
    if (openedAgent) {
      await openedAgent.update(data);
    }
  }

  /** 获取当前激活的 Agent ID */
  static getCurrentAgentId(): string {
    return currentOpenedAgent;
  }

  /** 设置当前激活的 Agent */
  static setCurrentAgent(id: string): void {
    currentOpenedAgent = id;
  }

  /** 获取加载状态 */
  static getLoadingState(id: string): boolean {
    return loadingState[id] || false;
  }

  /** 设置加载状态 */
  static setLoadingState(id: string, loading: boolean): void {
    loadingState[id] = loading;
  }
} 