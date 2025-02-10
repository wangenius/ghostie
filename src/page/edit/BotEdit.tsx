import { Header } from "@/components/custom/Header";
import { cmd } from "@/utils/shell";
import { BotProps } from "@common/types/bot";
import { useQuery } from "@hook/useQuery";
import { BotManager } from "@/services/bot/BotManger";
import { ModelManager } from "@/services/model/ModelManager";
import { ToolsManager } from "@/services/tool/ToolsManager";
import { useEffect, useRef, useState } from "react";
import { TbX } from "react-icons/tb";

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
    const plugins = ToolsManager.use();


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
                        <input
                            ref={inputRef}
                            type="text"
                            spellCheck={false}
                            value={bot.name}
                            onChange={(e) => setBot({ ...bot, name: e.target.value })}
                            className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                            placeholder="请输入助手名称"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">选择模型</label>
                        <select
                            value={bot.model}
                            onChange={(e) => setBot({ ...bot, model: e.target.value })}
                            className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                        >
                            <option value="">请选择模型</option>
                            {Object.keys(models).map((modelName) => (
                                <option key={modelName} value={modelName}>
                                    {modelName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">选择插件</label>
                        <div className="flex flex-wrap gap-2 p-2 bg-secondary rounded-md min-h-[2.25rem]">
                            {Object.values(plugins).map((plugin) => (
                                <label
                                    key={plugin.name}
                                    className="inline-flex items-center space-x-2 px-2 py-1 bg-background rounded"
                                >
                                    <input
                                        type="checkbox"
                                        checked={bot.tools.includes(plugin.name)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setBot({
                                                    ...bot,
                                                    tools: [...bot.tools, plugin.name]
                                                });
                                            } else {
                                                setBot({
                                                    ...bot,
                                                    tools: bot.tools.filter((t) => t !== plugin.name)
                                                });
                                            }
                                        }}
                                        className="form-checkbox h-4 w-4"
                                    />
                                    <span className="text-sm">{plugin.name}</span>
                                </label>
                            ))}
                        </div>
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
