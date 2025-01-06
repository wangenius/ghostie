import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export function AgentsTab() {
  const [agents, setAgents] = useState<any[]>([]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">代理管理</h2>
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground">
          <Plus className="w-4 h-4" />
          添加代理
        </button>
      </div>

      <div className="grid gap-4">
        {agents.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无代理配置
          </div>
        ) : (
          agents.map((agent, index) => (
            <div key={index} className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </div>
                <button className="p-2 rounded-md hover:bg-destructive/10 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 