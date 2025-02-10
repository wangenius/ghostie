import { TbX, TbPlus, TbTrash } from "react-icons/tb";
import { useEffect, useRef, useState } from "react";
import { PluginManager, Plugin, PluginArg } from "../../services/manager/PluginManager";
import { cmd } from "@/utils/shell";
import { useQuery } from "@hook/useQuery";
import { Header } from "@/components/custom/Header";

export function PluginEdit() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [scriptContent, setScriptContent] = useState("");
    const [args, setArgs] = useState<PluginArg[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [create, setCreate] = useState(true);
    const [plugin, setPlugin] = useState<Plugin | null>(null);

    const query = useQuery("name");
    const plugins = PluginManager.use();

    useEffect(() => {
        inputRef.current?.focus();
        if (query) {
            const pluginData = plugins[query];
            if (pluginData) {
                setCreate(false);
                setPlugin(pluginData);
                setName(pluginData.name);
                setDescription(pluginData.description || "");
                setScriptContent(pluginData.script_content);
                setArgs(pluginData.args);
            } else {
                setCreate(true);
                setPlugin(null);
                setName("");
                setDescription("");
                setScriptContent("");
                setArgs([]);
            }
        } else {
            setCreate(true);
            setPlugin(null);
            setName("");
            setDescription("");
            setScriptContent("");
            setArgs([]);
        }
    }, [query, plugins]);

    const handleClose = async () => {
        setName("");
        setDescription("");
        setScriptContent("");
        setArgs([]);
        cmd.close();
    };

    const addArg = () => {
        setArgs([
            ...args,
            {
                name: "",
                arg_type: "string",
                description: "",
                required: false,
                default_value: ""
            }
        ]);
    };

    const removeArg = (index: number) => {
        setArgs(args.filter((_, i) => i !== index));
    };

    const updateArg = (index: number, field: keyof PluginArg, value: string | boolean) => {
        const newArgs = [...args];
        newArgs[index] = { ...newArgs[index], [field]: value };
        setArgs(newArgs);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (create) {
            try {
                setIsSubmitting(true);
                await PluginManager.addPlugin({
                    enabled: true,
                    name,
                    description,
                    script_content: scriptContent,
                    args
                });
                // await emit("plugin-updated");
                await handleClose();
            } catch (error) {
                console.error("添加插件失败:", error);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            try {
                setIsSubmitting(true);
                if (!plugin) return;
                await PluginManager.updatePlugin(plugin.name, {
                    name,
                    description,
                    script_content: scriptContent,
                    enabled: plugin.enabled,
                    args
                });
                // await emit("plugin-updated");
                await handleClose();
            } catch (error) {
                console.error("更新插件失败:", error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header title={create ? "添加插件" : "编辑插件"} close={handleClose} />


            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">插件名称</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                            placeholder="输入插件名称"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">插件描述</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                            placeholder="输入插件描述"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">脚本内容</label>
                        <textarea
                            value={scriptContent}
                            onChange={(e) => setScriptContent(e.target.value)}
                            className="w-full px-3 py-2 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none min-h-[160px] resize-none placeholder:text-muted-foreground"
                            placeholder="输入js脚本内容"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs text-muted-foreground">参数列表</label>
                            <button
                                onClick={addArg}
                                className="flex items-center gap-1 px-2 h-6 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
                            >
                                <TbPlus className="w-3 h-3" />
                                添加参数
                            </button>
                        </div>
                        <div className="space-y-3">
                            {args.map((arg, index) => (
                                <div key={index} className="p-3 bg-secondary rounded-md space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">
                                            参数 {index + 1}
                                        </span>
                                        <button
                                            onClick={() => removeArg(index)}
                                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <TbTrash className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={arg.name}
                                            onChange={(e) =>
                                                updateArg(index, "name", e.target.value)
                                            }
                                            className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                                            placeholder="参数名称"
                                        />
                                        <select
                                            value={arg.arg_type}
                                            onChange={(e) =>
                                                updateArg(index, "arg_type", e.target.value)
                                            }
                                            className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                                        >
                                            <option value="string">字符串</option>
                                            <option value="number">数字</option>
                                            <option value="boolean">布尔值</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={arg.description}
                                            onChange={(e) =>
                                                updateArg(index, "description", e.target.value)
                                            }
                                            className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                                            placeholder="参数描述"
                                        />
                                        <input
                                            type="text"
                                            value={arg.default_value || ""}
                                            onChange={(e) =>
                                                updateArg(index, "default_value", e.target.value)
                                            }
                                            className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                                            placeholder="默认值"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={arg.required}
                                            onChange={(e) =>
                                                updateArg(index, "required", e.target.checked)
                                            }
                                            className="w-3 h-3"
                                        />
                                        <span className="text-xs text-muted-foreground">必填</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
                <button
                    onClick={handleClose}
                    className="px-3 h-8 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
                >
                    取消
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!name || !scriptContent || isSubmitting}
                    className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? (create ? "创建中..." : "更新中...") : create ? "创建" : "更新"}
                </button>
            </div>
        </div>
    );
}

PluginEdit.open = (name?: string) => {
    cmd.open("plugin-edit", { name }, { width: 500, height: 600 });
};
