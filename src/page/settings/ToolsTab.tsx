import { ToolItem } from "@/components/model/ToolItem";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToolEdit } from "@/page/edit/ToolEdit";
import { ToolsManager } from "@/services/tool/ToolsManager";
import { cmd } from "@/utils/shell";
import { ToolProps } from "@/common/types/model";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPackage, TbPlus, TbUpload } from "react-icons/tb";
import { PackageManager } from "../package/packageManager";
import { useEffect, useState } from 'react';

/**
 * 工具管理
 */

export function ToolsTab() {
    const [tools, setTools] = useState<Record<string, ToolProps>>({});

    // 加载工具列表
    const loadTools = async () => {
        try {
            console.log("开始加载工具列表");
            const toolsList = await ToolsManager.getAll();
            console.log("获取到的工具列表:", toolsList);
            setTools(toolsList);
            console.log("工具列表已更新:", tools); // 这里会显示旧值，因为 setState 是异步的
        } catch (error) {
            console.error("加载工具列表失败:", error);
            cmd.message("加载工具列表失败", "error");
        }
    };

    // 初始加载
    useEffect(() => {
        loadTools();
    }, []);

    const handleRemoveTool = async (name: string) => {
        try {
            await ToolsManager.remove(name);
            await loadTools(); // 重新加载列表
        } catch (error) {
            console.error("删除工具失败:", error);
            cmd.message("删除工具失败", "error");
        }
    };

    const handleImportPlugins = async () => {
        await ToolsManager.importFromJSON();
    };

    const handleImportTool = async () => {
        try {
            /* 打开文件选择器 */
            const result = await cmd.invoke<{ path: string; content: string }>(
                "open_file",
                {
                    title: "选择 TypeScript 插件文件",
                    filters: {
                        TypeScript文件: ["ts"],
                    }
                }
            );

            if (result && result.content) {
                try {

                    /* 注册插件 */
                    const plugin = await cmd.invoke<{
                        name: string;
                        description: string;
                        functions: Record<string, any>;
                    }>("register_deno_plugin_from_ts", {
                        content: result.content.trim(),
                    });

                    console.log(plugin);


                    if (!plugin || !plugin.functions) {
                        throw new Error("插件格式无效或解析失败");
                    }

                    let addedTools = 0;

                    // 遍历插件中的所有函数
                    for (const [funcName, func] of Object.entries(plugin.functions)) {
                        if (!func.name || !func.handler) {
                            console.warn(`跳过无效的函数定义: ${funcName}`, func);
                            continue;
                        }

                        const tool: ToolProps = {
                            name: func.name,
                            description: func.description || "",
                            content: typeof func.handler === 'string'
                                ? func.handler
                                : func.handler.toString(),
                            parameters: func.parameters?.properties || {},
                            dependencies: [],
                        };

                        console.log("添加工具:", tool);
                        await ToolsManager.add(tool);
                        addedTools++;
                    }

                    // 重新加载工具列表
                    await loadTools();

                    // 显示成功消息
                    cmd.message(`成功导入 ${addedTools} 个工具`, "success");
                } catch (parseError) {
                    console.error("解析插件失败:", parseError);
                    cmd.message(`解析插件失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`, "error");
                }
            }
        } catch (error) {
            console.error("导入插件失败:", error);
            cmd.message(`导入插件失败: ${error instanceof Error ? error.message : String(error)}`, "error");
        }
    };

    const handleExportTools = async () => {
        await ToolsManager.exportToJSON();
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => ToolEdit.open()}
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
                            <DropdownMenuItem onClick={() => ToolEdit.open()}>
                                <TbPlus className="w-4 h-4" />
                                <span>新建工具</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleImportTool}>
                                <TbUpload className="w-4 h-4" />
                                <span>导入 TypeScript 插件</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                PackageManager.open();
                            }}>
                                <TbPackage className="w-4 h-4" />
                                <span>依赖包管理</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleImportPlugins}>
                                <TbUpload className="w-4 h-4" />
                                <span>导入配置集</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportTools}>
                                <TbDownload className="w-4 h-4" />
                                <span>导出配置集</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                    {Object.values(tools).map((tool) => {
                        if (!tool) return null;
                        return (
                            <ToolItem
                                key={tool.name}
                                name={tool.name}
                                description={tool.description || ""}
                                onEdit={() => ToolEdit.open(tool.name)}
                                onDelete={() => handleRemoveTool(tool.name)}
                            />
                        );
                    })}

                </div>
            </div>
        </div>
    );
}
