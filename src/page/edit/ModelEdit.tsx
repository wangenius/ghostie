import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelManager } from "@/services/model/ModelManager";
import { Model } from "@common/types/model";
import { useQuery } from "@hook/useQuery";
import { cmd } from "@utils/shell";
import { useEffect, useRef, useState } from "react";
import { TbCopy } from "react-icons/tb";


const defaultModel: Model = {
    id: "",
    name: "",
    api_key: "",
    api_url: "",
    model: ""
};

/* 模型编辑 */
export function ModelEdit() {
    const [model, setModel] = useState<Model>(defaultModel);
    const [create, setCreate] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const query = useQuery("id");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        inputRef.current?.focus();
        setLoading(true);
        if (query !== "new" && query !== null) {
            const modelData = ModelManager.store.current[query];
            if (modelData) {
                setCreate(false);
                setModel(modelData);
            } else {
                setCreate(true);
                setModel(defaultModel);
            }
        } else {
            setCreate(true);
            setModel(defaultModel);
        }
        setLoading(false);
    }, [query]);


    const handleClose = async () => {
        cmd.close();
        setModel(defaultModel);
        setCreate(true);
        setLoading(true);
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            if (create) {
                ModelManager.add(model);
            } else {
                ModelManager.update(model.id, model);
            }

            await handleClose();
        } catch (error) {
            console.error(create ? "添加模型失败:" : "更新模型失败:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen bg-background">
                <Header title={create ? "添加模型" : "编辑模型"} close={handleClose} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header title={create ? "添加模型" : "编辑模型"} close={handleClose} />
            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">配置名称</label>
                        <Input
                            ref={inputRef}
                            type="text"
                            spellCheck={false}
                            value={model.name}
                            onChange={(e) => setModel({ ...model, name: e.target.value })}

                            placeholder="请输入配置名称"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">API Key</label>
                        <Input
                            type="password"
                            spellCheck={false}
                            value={model.api_key}
                            onChange={(e) => setModel({ ...model, api_key: e.target.value })}
                            placeholder={
                                create ? "请输入 API Key" : "如需更新 API Key 请输入新的值"
                            }
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">API URL：</label>
                        <Input
                            type="text"
                            spellCheck={false}
                            value={model.api_url}
                            onChange={(e) => setModel({ ...model, api_url: e.target.value })}
                            placeholder="整个 API URL，包括base_url/v1/chat/completions"
                        />
                        <small className="text-xs text-muted-foreground">
                            比如：https://api.openai.com/v1/chat/completions
                        </small>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">模型标识符</label>
                        <Input
                            type="text"
                            spellCheck={false}
                            value={model.model}
                            onChange={(e) => setModel({ ...model, model: e.target.value })}
                            placeholder="如：gpt-3.5-turbo"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3">

                <Button
                    variant="ghost"
                    onClick={() => {
                        ModelManager.copy(model.id);
                        cmd.message("一个新的模型副本已添加", "成功");
                    }}
                >
                    <TbCopy className="w-4 h-4" />
                    添加副本
                </Button>

                <Button
                    variant="ghost"
                    onClick={handleClose}
                >
                    取消
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!model.name || !model.model || !model.api_url || (create && !model.api_key) || isSubmitting}
                    variant="primary"
                >
                    {isSubmitting ? (create ? "添加中..." : "更新中...") : create ? "添加" : "更新"}
                </Button>
            </div>
        </div>
    );
}

ModelEdit.open = (id: string = "new") => {
    cmd.open("model-edit", { id }, { width: 400, height: 600 });
};

