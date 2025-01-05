import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { AgentInfo, BotInfo } from "../types";

export interface Bot {
  name: string;
  systemPrompt: string;
}

export function useBots() {
  const [allBots, setAllBots] = useState<Bot[]>([]);
  const [recentBots, setRecentBots] = useState<string[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  const loadBots = async () => {
    try {
      const response = await invoke<{
        bots: Array<{ name: string; system_prompt: string }>;
        recent_bots: string[];
      }>("list_bots");

      setAllBots(
        response.bots.map((bot) => ({
          name: bot.name,
          systemPrompt: bot.system_prompt,
        }))
      );
      setRecentBots(response.recent_bots);
    } catch (error) {
      console.error("加载 bots 失败:", error);
    }
  };

  const loadAgents = async () => {
    try {
      const agentsList = await invoke<AgentInfo[]>("list_agents");
      setAgents(agentsList.map((agent) => ({ ...agent, type: "agent" as const })));
    } catch (error) {
      console.error("加载 agents 失败:", error);
    }
  };

  const updateRecentBot = async (name: string) => {
    try {
      await invoke("update_recent_bot", { name });
      await loadBots(); // 重新加载以获取最新的排序
    } catch (error) {
      console.error("更新最近使用的 bot 失败:", error);
    }
  };

  // 转换为前端使用的格式
  const bots: BotInfo[] = allBots.map((bot) => ({
    name: bot.name,
    systemPrompt: bot.systemPrompt,
    type: "bot" as const,
  }));

  return {
    bots,
    agents,
    recentBots,
    loadBots,
    loadAgents,
    updateRecentBot,
  };
} 