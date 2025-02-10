import { Header } from "@/components/custom/Header";
import { Model } from "@common/types/model";
import { useQuery } from "@hook/useQuery";
import { ModelManager } from "@/services/model/ModelManager";
import { cmd } from "@utils/shell";
import { useEffect, useRef, useState } from "react";
import { TbX } from "react-icons/tb";


const defaultModel: Model = {
    name: "",
    api_key: "",
    api_url: "",
    model: ""
};

/* 模型编辑 */
export function ModelEdit() {
    const [model, setModel] = useState<Model>(defaultModel);
    const [originalName, setOriginalName] = useState<string>("");
    const [create, setCreate] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const query = useQuery("name");

    useEffect(() => {
        inputRef.current?.focus();
        if (query) {
            // 如果有name参数，说明是编辑模式
            setCreate(false);
            setOriginalName(query);
            // 获取对应的模型数据
            const modelData = ModelManager.store.current[query];
            if (modelData) {
                setModel(modelData);
            }
        }
    }, [query]);


    const handleClose = async () => {
        cmd.close();
        setModel(defaultModel);
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            if (create) {
                ModelManager.add(model);
            } else {
                ModelManager.update(originalName, model);
            }

            await handleClose();
        } catch (error) {
            console.error(create ? "添加模型失败:" : "更新模型失败:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header title={create ? "添加模型" : "编辑模型"} close={handleClose} />

            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">配置名称</label>
                        <input
                            ref={inputRef}
                            type="text"
                            spellCheck={false}
                            value={model.name}
                            onChange={(e) => setModel({ ...model, name: e.target.value })}
                            className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                            placeholder="请输入配置名称"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">API Key</label>
                        <input
                            type="password"
                            spellCheck={false}
                            value={model.api_key}
                            onChange={(e) => setModel({ ...model, api_key: e.target.value })}
                            className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                            placeholder={
                                create ? "请输入 API Key" : "如需更新 API Key 请输入新的值"
                            }
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">API URL：</label>
                        <input
                            type="text"
                            spellCheck={false}
                            value={model.api_url}
                            onChange={(e) => setModel({ ...model, api_url: e.target.value })}
                            className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                            placeholder="整个 API URL，包括base_url/v1/chat/completions"
                        />
                        <small className="text-xs text-muted-foreground">
                            比如：https://api.openai.com/v1/chat/completions
                        </small>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">模型标识符</label>
                        <input
                            type="text"
                            spellCheck={false}
                            value={model.model}
                            onChange={(e) => setModel({ ...model, model: e.target.value })}
                            className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                            placeholder="如：gpt-3.5-turbo"
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
                    disabled={!model.name || !model.model || !model.api_url || (create && !model.api_key) || isSubmitting}
                    className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? (create ? "添加中..." : "更新中...") : create ? "添加" : "更新"}
                </button>
            </div>
        </div>
    );
}

ModelEdit.open = (name?: string) => {
    cmd.open("model-edit", { name }, { width: 400, height: 600 });
};

