import { Agent } from "./Agent";
import { AgentInfos } from "./types/agent";
import { registerIpcHandlers, unregisterIpcHandlers } from "../ipc/decorators";

/**
 * Agent IPC 管理器
 * 负责管理 Agent 实例和 IPC 处理器的注册
 */
export class AgentIpcManager {
    private static instance: AgentIpcManager;
    private agents: Map<string, Agent> = new Map();
    private globalAgent: Agent | null = null;

    private constructor() {}

    static getInstance(): AgentIpcManager {
        if (!AgentIpcManager.instance) {
            AgentIpcManager.instance = new AgentIpcManager();
        }
        return AgentIpcManager.instance;
    }

    /**
     * 初始化全局 Agent 实例
     * 这个实例将处理所有的 IPC 请求
     */
    async initializeGlobalAgent(): Promise<void> {
        if (this.globalAgent) {
            return;
        }

        try {
            // 创建一个全局 Agent 实例来处理 IPC 请求
            // 使用默认配置确保有文本模型
            this.globalAgent = await Agent.create("global-agent");
            console.log("全局 Agent IPC 处理器已初始化");
        } catch (error) {
            console.error("初始化全局 Agent 失败:", error);
            // 即使初始化失败，也要创建一个基本的 Agent 实例来处理 IPC
            const { DEFAULT_AGENT } = await import("./types/agent");
            const { ReactAgent } = await import("./ReactAgent");
            this.globalAgent = new ReactAgent({
                ...DEFAULT_AGENT,
                id: "global-agent",
                name: "Global Agent",
                system: "你是一个全局的AI助手，用于处理系统级的请求。",
            });
            console.log("使用默认配置创建全局 Agent");
        }
    }

    /**
     * 获取全局 Agent 实例
     */
    getGlobalAgent(): Agent | null {
        return this.globalAgent;
    }

    /**
     * 创建并注册新的 Agent
     */
    async createAgent(id?: string, infos?: Partial<AgentInfos>): Promise<Agent> {
        const agent = await Agent.create(id);
        if (infos) {
            await agent.update(infos);
        }
        
        if (id) {
            this.agents.set(id, agent);
        }
        
        return agent;
    }

    /**
     * 获取 Agent 实例
     */
    getAgent(id: string): Agent | undefined {
        return this.agents.get(id);
    }

    /**
     * 删除 Agent 实例
     */
    removeAgent(id: string): void {
        const agent = this.agents.get(id);
        if (agent) {
            agent.close(); // 这会自动取消注册 IPC 处理器
            this.agents.delete(id);
        }
    }

    /**
     * 获取所有 Agent 实例
     */
    getAllAgents(): Map<string, Agent> {
        return new Map(this.agents);
    }

    /**
     * 清理所有 Agent 实例
     */
    cleanup(): void {
        // 清理所有 Agent 实例
        for (const [id, agent] of this.agents) {
            agent.close();
        }
        this.agents.clear();

        // 清理全局 Agent
        if (this.globalAgent) {
            this.globalAgent.close();
            this.globalAgent = null;
        }
    }
} 