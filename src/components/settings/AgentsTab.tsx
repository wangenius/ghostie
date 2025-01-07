import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask } from '@tauri-apps/plugin-dialog';
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { AgentManager } from "../../services/AgentManager";

export function AgentsTab() {
  const { list: agents } = AgentManager.use();

  useEffect(() => {
    // 初始加载
    AgentManager.loadAgents();

    // 监听 agent 更新事件
    const unlisten = listen("agent-updated", () => {
      AgentManager.loadAgents();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleOpenAgentAdd = async () => {
    await invoke("open_window", { name: "agent-edit" });
  };

  const handleOpenAgentEdit = async (name: string) => {
    await invoke("open_window", {
      name: "agent-edit",
      query: { name }
    });
  };

  const handleRemoveAgent = async (name: string) => {
    const answer = await ask(`确定要删除代理 "${name}" 吗？`, {
      title: "Tauri",
      kind: "warning",
    });

    if (answer) {
      try {
        await AgentManager.removeAgent(name);
      } catch (error) {
        console.error("删除代理失败:", error);
      }
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleOpenAgentAdd}
          className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">添加代理</span>
        </button>
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-muted-foreground">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{agent.name}</div>
                <div className="text-xs text-muted-foreground truncate">{agent.description}</div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 ml-2">
              <button
                onClick={() => handleOpenAgentEdit(agent.name)}
                className="p-1.5 text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleRemoveAgent(agent.name)}
                className="p-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 