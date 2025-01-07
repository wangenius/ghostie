import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { Database, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Space {
    name: string;
    description: string;
    path: string;
    isActive: boolean;
}

export function SpaceTab() {
    const [spaces, setSpaces] = useState<Space[]>([]);

    useEffect(() => {
        // 初始加载
        loadSpaces();

        // 监听空间更新事件
        const unlisten = listen("space-updated", () => {
            loadSpaces();
        });

        return () => {
            unlisten.then(fn => fn());
        };
    }, []);

    const loadSpaces = async () => {
        try {
            const result = await invoke<Space[]>("list_spaces");
            setSpaces(result);
        } catch (error) {
            console.error("加载空间列表失败:", error);
        }
    };

    const handleOpenSpaceAdd = async () => {
        await invoke("open_window", { name: "space-edit" });
    };

    const handleOpenSpaceEdit = async (name: string) => {
        await invoke("open_window", {
            name: "space-edit",
            query: { name }
        });
    };

    const handleRemoveSpace = async (name: string) => {
        const answer = await ask(`确定要删除空间 "${name}" 吗？\n注意：这将删除该空间下的所有数据！`, {
            title: "删除确认",
            kind: "warning",
        });

        if (answer) {
            try {
                await invoke("remove_space", { name });
                await loadSpaces();
            } catch (error) {
                console.error("删除空间失败:", error);
            }
        }
    };

    return (
        <div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleOpenSpaceAdd}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">添加空间</span>
                </button>
                {spaces.map((space) => (
                    <div
                        key={space.name}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="text-muted-foreground">
                                <Database className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                    {space.name}
                                    {space.isActive && <span className="ml-2 text-xs text-green-500">(活跃)</span>}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{space.description}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-0.5 ml-2">
                            <button
                                onClick={() => handleOpenSpaceEdit(space.name)}
                                className="p-1.5 text-muted-foreground hover:text-primary"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleRemoveSpace(space.name)}
                                className="p-1.5 text-muted-foreground hover:text-destructive"
                                disabled={space.isActive}
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