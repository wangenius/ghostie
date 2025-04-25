import { Agent } from "@/agent/Agent";
import { ContextRuntimeProps } from "@/agent/context/Runtime";
import { AgentInfos } from "@/agent/types/agent";
import { AGENT_DATABASE, CONTEXT_RUNTIME_DATABASE } from "@/assets/const";
import { Echoi } from "@/lib/echo/Echo";

/* AgentList */
export const AgentsListStore = new Echoi<Record<string, AgentInfos>>(
  {},
).indexed({
  database: AGENT_DATABASE,
  name: "index",
});
/* 当前打开的全部Agent实例 */
export const OpenedAgents = new Map<string, Agent>();
/* 当前打开的Agent实例 */
export const CurrentAgentChatId = new Echoi<string>("");
/* 当前打开的Agent实例的loading状态 */
export const OpenedAgentsLoadingState = new Echoi<Record<string, boolean>>({});
/* 当前打开的Agent实例的上下文 */
export const CurrentAgentContextRuntime = new Echoi<
  Record<string, ContextRuntimeProps>
>({}).indexed({
  database: CONTEXT_RUNTIME_DATABASE,
  name: "",
});
