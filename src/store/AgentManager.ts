import { ContextRuntimeProps } from "@/agent/context/Context";
import { AGENT_DATABASE, CONTEXT_RUNTIME_DATABASE } from "@/assets/const";
import { Echoi } from "@/lib/echo/Echo";
import { Agent } from "../agent/Agent";
import { AgentInfos } from "../agent/types/agent";

export class AgentManager {
  /* agents list */
  static list = new Echoi<Record<string, AgentInfos>>({}).indexed({
    database: AGENT_DATABASE,
    name: "index",
  });

  static CurrentContexts = new Echoi<Record<string, string>>({}).indexed({
    database: CONTEXT_RUNTIME_DATABASE,
    name: "index",
  });

  /* 当前打开的Agent */
  static OPENED_AGENTS = new Echoi<Record<string, Agent>>({});

  static {
    AgentManager.list.getCurrent().then((list) => {
      Object.values(list).map((item) => {
        AgentManager.getById(item.id).then((agent) => {
          AgentManager.OPENED_AGENTS.set({ [item.id]: agent });
        });
      });
    });
  }

  /* 当前打开的AgentId */
  static currentOpenedAgent = new Echoi<string>("");

  /* 当前的Agent是否正在运行 */
  static loadingState = new Echoi<Record<string, boolean>>({});

  static async getById(id: string): Promise<Agent> {
    const agent = await Agent.create(id);
    const contexts = await Echoi.get<Record<string, ContextRuntimeProps>>({
      database: CONTEXT_RUNTIME_DATABASE,
      name: agent.infos.id,
    }).getCurrent();
    const currentContext = await AgentManager.CurrentContexts.getCurrent();
    const context = contexts?.[currentContext?.[agent.infos.id]];
    agent.context.setRuntime(context);
    return agent;
  }
}
