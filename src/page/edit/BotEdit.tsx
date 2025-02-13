import { PluginProps, ToolProps } from "@/common/types/plugin";
import { Header } from "@/components/custom/Header";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BotManager } from "@/services/bot/BotManger";
import { ModelManager } from "@/services/model/ModelManager";
import { cmd } from "@/utils/shell";
import { BotProps } from "@common/types/bot";
import { useQuery } from "@hook/useQuery";
import { useCallback, useEffect, useRef, useState } from "react";

const defaultBot: BotProps = {
    name: "",
    system: "",
    model: "",
    tools: []
};

export function BotEdit() {
    const [bot, setBot] = useState<BotProps>(defaultBot);
    const [originalName, setOriginalName] = useState<string>("");
    const [create, setCreate] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const query = useQuery("name");
    console.log(query);
    const models = ModelManager.use();

    const [plugins, setPlugins] = useState<Record<string, PluginProps>>({});

    const loadPlugins = useCallback(async () => {
        const tools = await cmd.invoke<Record<string, PluginProps>>("plugins_list");
        setPlugins(tools);
    }, []);

    useEffect(() => {
        loadPlugins();
    }, [loadPlugins]);

    useEffect(() => {
        inputRef.current?.focus();
        if (query) {
            const botData = BotManager.store.current[query];
            if (botData) {
                setCreate(false);
                setOriginalName(query);
                setBot(botData);
            } else {
                setCreate(true);
                setOriginalName("");
                setBot(defaultBot);
            }
        } else {
            setCreate(true);
            setOriginalName("");
            setBot(defaultBot);
        }
    }, [query]);

    const handleClose = async () => {
        cmd.close();
        setBot(defaultBot);
        setCreate(true);
        setOriginalName("");
    };


    const handleSubmit = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            if (create) {
                BotManager.add(bot);
            } else {
                BotManager.update(originalName, bot);
            }
            await handleClose();
        } catch (error) {
            console.error(create ? "添加助手失败:" : "更新助手失败:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header title={create ? "添加助手" : "编辑助手"} close={handleClose} />


            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">助手名称</label>
                        <Input
                            ref={inputRef}
                            type="text"
                            spellCheck={false}
                            value={bot.name}
                            onChange={(e) => setBot({ ...bot, name: e.target.value })}
                            placeholder="请输入助手名称"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">选择模型</label>
                        <Select
                            value={bot.model}
                            onValueChange={(value) => setBot({ ...bot, model: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="请选择模型" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(models).map((modelName) => (
                                    <SelectItem key={modelName} value={modelName}>
                                        {modelName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">选择插件</label>
                        <MultiSelect
                            options={Object.values(plugins).flatMap((plugin: PluginProps) =>
                                plugin.tools.map((tool: ToolProps) => ({
                                    label: "[" + plugin.name + "]" + tool.name,
                                    value: "[" + plugin.name + "]" + tool.name
                                }))
                            )}
                            value={bot.tools}
                            onChange={(value) => setBot({ ...bot, tools: value })}
                            className="bg-secondary"
                            placeholder="选择插件..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">助手提示词</label>
                        <textarea
                            value={bot.system}
                            onChange={(e) => setBot({ ...bot, system: e.target.value })}
                            className="w-full h-40 px-3 py-2 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground resize-none"
                            placeholder="请输入助手提示词"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3">
                <button
                    onClick={handleClose}
                    className="px-3 h-8 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
                >
                    取消
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!bot.name || !bot.system || !bot.model || isSubmitting}
                    className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? (create ? "添加中..." : "更新中...") : create ? "添加" : "更新"}
                </button>
            </div>
        </div>
    );
}


BotEdit.open = (name?: string) => {
    cmd.open("bot-edit", { name }, { width: 400, height: 600 });
};
