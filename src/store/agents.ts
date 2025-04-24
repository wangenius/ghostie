import { AgentInfos } from "@/agent/types/agent";
import { AGENT_DATABASE } from "@/assets/const";
import { Echo } from "@/lib/echo/core/Echo";

/* Agent仓库 */
export const AgentStore = new Echo<Record<string, AgentInfos>>({}).indexed({
  database: AGENT_DATABASE,
  name: "index",
});
