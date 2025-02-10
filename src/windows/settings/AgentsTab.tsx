import { TbBolt, TbPencil, TbPlus, TbTrash } from "react-icons/tb";
import { useEffect } from "react";
import { AgentManager } from "@/services/agent/AgentManager";

export function AgentsTab() {
    const { list: agents } = AgentManager.use();

    useEffect(() => { }, []);

    const handleOpenAgentAdd = async () => {
        // await invoke("open_window", { name: "agent-edit" });
    };

    const handleOpenAgentEdit = async (name: string) => {
        // await invoke("open_window", {
        //     name: "agent-edit",
        //     query: { name }
        // });
    };

    const handleRemoveAgent = async (name: string) => {
        //     const answer = await ask(`确定要删除代理 "${name}" 吗？`, {
        //         title: "Tauri",
        //         kind: "warning"
        //     });
        // if (answer) {
        //     try {
        //         await AgentManager.removeAgent(name);
        //     } catch (error) {
        //         console.error("删除代理失败:", error);
        //     }
        // }
    };

    return (
        <div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleOpenAgentAdd}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                    <TbPlus className="w-4 h-4" />
                    <span className="text-sm font-medium">添加代理</span>
                </button>

                {agents.map((agent) => (
                    <div
                        key={agent.name}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="text-muted-foreground">
                                <TbBolt className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                    {agent.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {agent.description}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-0.5 ml-2">
                            <button
                                onClick={() => handleOpenAgentEdit(agent.name)}
                                className="p-1.5 text-muted-foreground hover:text-primary"
                            >
                                <TbPencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleRemoveAgent(agent.name)}
                                className="p-1.5 text-muted-foreground hover:text-destructive"
                            >
                                <TbTrash className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
