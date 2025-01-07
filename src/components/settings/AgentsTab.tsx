import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function AgentsTab() {
  const [agents, setAgents] = useState<any[]>([]);
  const handleOpenAgentAdd = async () => {
    await invoke("open_window", { name: "agent-add" });
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
        {agents.map((agent, index) => (
          <div
            key={index}
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
                className="p-1.5 text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
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