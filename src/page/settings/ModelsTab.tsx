import { ModelEdit } from "@/page/edit/ModelEdit";
import { Button } from "@/components/ui/button";
import { ModelItem } from "@components/model/ModelItem";
import { ModelManager } from "@/services/model/ModelManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";

/* 模型管理 */

export function ModelsTab() {
    /* 获取模型 */
    const models = ModelManager.use();

    /* 删除模型 */
    const handleDeleteModel = async (id: string) => {
        const answer = await cmd.confirm(`确定要删除模型 "${id}" 吗？`);
        if (answer) {
            try {
                ModelManager.remove(id);
            } catch (error) {
                console.error("删除模型失败:", error);
            }
        }
    };

    useEffect(() => {
        console.log(models);
    }, [models]);

    /* 导入模型 */
    const handleImport = async () => {
        try {
            // 打开文件选择对话框
            const result = await cmd.invoke<{ path: string; content: string }>(
                "open_file",
                {
                    title: "选择模型配置文件",
                    filters: {
                        模型配置: ["json"],
                    },
                }
            );

            if (result) {
                // 导入模型配置
                ModelManager.import(result.content);
                await cmd.message("成功导入模型配置", "导入成功");
            }
        } catch (error) {
            console.error("导入模型失败:", error);
            await cmd.message(`导入模型失败: ${error}`, "导入失败");
        }
    };

    /* 导出模型 */
    const handleExport = async () => {
        try {
            // 获取所有模型数据
            const modelsJson = ModelManager.export();

            // 打开保存文件对话框
            const result = await cmd.invoke<boolean>("save_file", {
                title: "保存模型配置",
                filters: {
                    模型配置: ["json"],
                },
                defaultName: "models.json",
                content: modelsJson,
            });

            if (result) {
                await cmd.message("成功导出模型配置", "导出成功");
            }
        } catch (error) {
            console.error("导出模型失败:", error);
            await cmd.message(`导出模型失败: ${error}`, "导出失败");
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => ModelEdit.open()}
                    >
                        <TbPlus className="w-4 h-4" />
                        <span>新建</span>
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <PiDotsThreeBold className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleImport}>
                                <TbUpload className="w-4 h-4" />
                                <span>导入</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={handleExport}>
                                <TbDownload className="w-4 h-4" />
                                <span>导出</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* 模型列表区域 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 gap-1 ">
                    <div className="text-xs text-gray-500 bg-muted p-2 rounded-md">
                        模型支持: 阿里千问, deepseek, ChatGPT等gpt接口的模型。智谱或Claude等模型请等待更新。
                    </div>
                    {Object.entries(models).map(([id, model]) => (
                        <ModelItem
                            key={id}
                            id={id}
                            model={model}
                            onEdit={() => ModelEdit.open(id)}
                            onDelete={handleDeleteModel}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
