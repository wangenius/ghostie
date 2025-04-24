import { AgentInfos } from "@/agent/types/agent";
import { AGENT_DATABASE } from "@/assets/const";
import { Echo } from "echo-state";

/* Agent仓库 */
export const AgentStore = new Echo<Record<string, AgentInfos>>({}).indexed({
  database: AGENT_DATABASE,
  name: "index",
});
