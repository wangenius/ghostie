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

  static loadAgents = async () => {
    // AgentManager.state.set(
    //     {
    //         list: agents,
    //         current: agents[0]?.name || ""
    //     },
    //     true
    // );
  };
}
