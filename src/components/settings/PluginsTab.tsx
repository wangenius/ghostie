import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { Pencil, Play, Plus, Puzzle, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { PluginManager } from "../../services/PluginManager";

export function PluginsTab() {
	const { list: plugins } = PluginManager.use();

	useEffect(() => {
		// 初始加载
		PluginManager.loadPlugins();

		// 监听插件更新事件
		const unlisten = listen("plugin-updated", () => {
			PluginManager.loadPlugins();
		});

		return () => {
			unlisten.then(fn => fn());
		};
	}, []);

	const handleOpenPluginAdd = async () => {
		await invoke("open_window", { name: "plugin-edit" });
	};

	const handleOpenPluginEdit = async (name: string) => {
		await invoke("open_window", {
			name: "plugin-edit",
			query: { name }
		});
	};

	const handleRemovePlugin = async (name: string) => {
		const answer = await ask(`确定要删除插件 "${name}" 吗？`, {
			title: "Tauri",
			kind: "warning",
		});

		if (answer) {
			try {
				await PluginManager.removePlugin(name);
			} catch (error) {
				console.error("删除插件失败:", error);
			}
		}
	};

	const handleRunPlugin = async (name: string) => {
		await invoke("open_window", {
			name: "plugin-run",
			query: { name }
		});
	};

	return (
		<div>
			<div className="grid grid-cols-2 gap-2">
				<button
					onClick={handleOpenPluginAdd}
					className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
				>
					<Plus className="w-4 h-4" />
					<span className="text-sm font-medium">添加插件</span>
				</button>
				{plugins.map((plugin) => (
					<div
						key={plugin.name}
						className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary"
					>
						<div className="flex items-center gap-2 min-w-0">
							<div className="text-muted-foreground">
								<Puzzle className="w-4 h-4" />
							</div>
							<div className="min-w-0">
								<div className="text-sm font-medium text-foreground truncate">{plugin.name}</div>
								<div className="text-xs text-muted-foreground truncate">{plugin.description}</div>
							</div>
						</div>
						<div className="flex items-center gap-0.5 ml-2">
							<button
								onClick={() => handleRunPlugin(plugin.name)}
								className="p-1.5 text-muted-foreground hover:text-green-500"
							>
								<Play className="w-3.5 h-3.5" />
							</button>
							<button
								onClick={() => handleOpenPluginEdit(plugin.name)}
								className="p-1.5 text-muted-foreground hover:text-primary"
							>
								<Pencil className="w-3.5 h-3.5" />
							</button>
							<button
								onClick={() => handleRemovePlugin(plugin.name)}
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