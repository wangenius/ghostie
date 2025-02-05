import { invoke } from "@tauri-apps/api/core";
import { Echo } from "echo-state";

export interface Tool {
  name: string;
  type: "function" | "command" | "agent";
  description: string;
  parameters?: {
    name: string;
    description: string;
    required?: boolean;
    type: string;
  }[];
}

export interface Knowledge {
  name?: string;
  description: string;
  url?: string;
  text?: string;
  file?: string;
}

export interface Agent {
  name: string;
  description?: string;
  systemPrompt: string;
  temperature: number;
  timing: {
    type: "once" | "minutely" | "hourly" | "daily" | "weekly" | "monthly";
    time?: string; // HH:mm 格式
    dayOfWeek?: number; // 0-6, 用于每周
    dayOfMonth?: number; // 1-31, 用于每月
    enable: boolean;
  };
  skills: Tool[];
  knowledge: Knowledge[];
  env: Record<string, string>;
}

export class AgentManager {
  static state = new Echo<{
    list: Agent[];
    current: string;
  }>({
    list: [],
    current: "",
  });

  static use = AgentManager.state.use.bind(AgentManager.state);

  static setCurrent = (name: string) => {
    AgentManager.state.set(
      (state) => ({
        ...state,
        current: name,
      }),
      true
    );
  };

  static loadAgents = async () => {
    const agents = await invoke<Agent[]>("list_agents");
    AgentManager.state.set(
      {
        list: agents,
        current: agents[0]?.name || "",
      },
      true
    );
  };

  static addAgent = async (agent: Agent) => {
    await invoke("add_agent", { agent });
    await AgentManager.loadAgents();
  };

  static removeAgent = async (name: string) => {
    await invoke("remove_agent", { name });
    await AgentManager.loadAgents();
  };

  static getAgent = async (name: string) => {
    return await invoke<Agent>("get_agent", { name });
  };

  static executeCommand = async (
    agentName: string,
    command: string,
    env?: Record<string, string>
  ) => {
    return await invoke<string>("execute_agent_command", {
      agentName,
      command,
      env,
    });
  };
}
