import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { AgentInfo, BotInfo } from "../types";

export function useBots() {
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  const loadBots = async () => {
    try {
      const botsList = await invoke<[string, boolean, string][]>("list_bots");
      setBots(
        botsList.map(([name, isCurrent, systemPrompt]) => ({
          name,
          isCurrent,
          systemPrompt,
          type: "bot" as const,
        }))
      );
    } catch (error) {
      console.error("加载 bots 失败:", error);
    }
  };

  const loadAgents = async () => {
    try {
      const agentsList = await invoke<AgentInfo[]>("list_agents");
      setAgents(
        agentsList.map((agent) => ({ ...agent, type: "agent" as const }))
      );
    } catch (error) {
      console.error("加载 agents 失败:", error);
    }
  };

  const setCurrentBot = async (name: string) => {
    try {
      await invoke("set_current_bot", { name });
      await loadBots();
    } catch (error) {
      console.error("设置当前 bot 失败:", error);
    }
  };

  return {
    bots,
    agents,
    loadBots,
    loadAgents,
    setCurrentBot,
  };
} 