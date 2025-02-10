import { TbX } from "react-icons/tb";
import { useEffect, useState } from "react";
import { Plugin, PluginArg, PluginManager } from "../../services/manager/PluginManager";

export function PluginRun() {
    const [plugin, setPlugin] = useState<Plugin | null>(null);
    const [argValues, setArgValues] = useState<Record<string, string>>({});
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(
        null
    );

    const handleClose = async () => {
        // const window = await getCurrentWindow();
        setPlugin(null);
        setArgValues({});
        // window.hide();
    };

    const updateArgValue = (name: string, value: string) => {
        setArgValues((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRun = async () => {
        if (!plugin || isRunning) return;

        // 验证必填参数
        const missingArgs = plugin.args?.filter((arg) => arg.required && !argValues[arg.name]);

        if (missingArgs && missingArgs.length > 0) {
            setResult({
                type: "error",
                message: `请填写必填参数: ${missingArgs.map((arg) => arg.name).join(", ")}`
            });
            return;
        }

        try {
            setIsRunning(true);
            setResult(null);
            const result = await PluginManager.runPlugin(plugin.name, argValues);
            setResult({
                type: "success",
                message: String(result)
            });
        } catch (error) {
            console.error(`运行插件 "${plugin.name}" 失败:`, error);
            setResult({
                type: "error",
                message: `运行失败: ${error instanceof Error ? error.message : String(error)}`
            });
        } finally {
            setIsRunning(false);
        }
    };

    const renderArgInput = (arg: PluginArg) => {
        switch (arg.arg_type) {
            case "boolean":
                return (
                    <input
                        type="checkbox"
                        checked={argValues[arg.name] === "true"}
                        onChange={(e) => updateArgValue(arg.name, e.target.checked.toString())}
                        className="w-4 h-4"
                        placeholder={`${arg.description || arg.name}`}
                    />
                );
            case "number":
                return (
                    <input
                        type="number"
                        value={argValues[arg.name]}
                        onChange={(e) => updateArgValue(arg.name, e.target.value)}
                        className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                        placeholder={`请输入${arg.description || arg.name}`}
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={argValues[arg.name]}
                        onChange={(e) => updateArgValue(arg.name, e.target.value)}
                        className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                        placeholder={`请输入${arg.description || arg.name}`}
                    />
                );
        }
    };

    return (
        <div className="app-container flex flex-col h-screen bg-background">
            <div
                className="flex items-center justify-between h-12 px-4 border-b border-border"
                data-tauri-drag-region
            >
                <div className="text-sm font-medium text-foreground">运行插件</div>
                <button
                    onClick={handleClose}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <TbX className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {plugin && (
                    <div className="space-y-4">
                        <div>
                            <div className="text-lg font-medium">{plugin.name}</div>
                            <div className="text-sm text-muted-foreground">
                                {plugin.description}
                            </div>
                        </div>

                        {plugin.args && plugin.args.length > 0 && (
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">参数设置</div>
                                {plugin.args.map((arg) => (
                                    <div key={arg.name} className="space-y-1.5">
                                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                                            {arg.name}
                                            {arg.required && (
                                                <span className="text-red-500">*</span>
                                            )}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {renderArgInput(arg)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-4">
                    <div className="text-sm text-muted-foreground">执行结果</div>
                </div>
                {result && (
                    <div
                        className={`p-3 !select-text rounded-md text-sm ${
                            result.type === "success"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                    >
                        {result.message}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
                <button
                    onClick={handleClose}
                    className="px-3 h-8 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
                >
                    取消
                </button>
                <button
                    onClick={handleRun}
                    disabled={!plugin || isRunning}
                    className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                    {isRunning ? "运行中..." : "运行"}
                </button>
            </div>
        </div>
    );
}
