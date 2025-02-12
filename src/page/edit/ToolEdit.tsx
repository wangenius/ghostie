import { PackageInfo, ToolProperty, ToolProps } from "@/common/types/model";
import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BundleManager } from "@/services/bundle/BundleManager";
import { cmd } from "@/utils/shell";
import { useQuery } from "@hook/useQuery";
import { useEffect, useRef, useState } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { ToolsManager } from "../../services/tool/ToolsManager";
interface Parameter extends Omit<ToolProperty, "properties"> {
    id: string;
    name: string;
    parent?: string;
}

/** 将普通参数转换为带有id的参数结构 */
const convertToParameterWithId = (properties: Record<string, ToolProperty>, parentId?: string): Record<string, Parameter> => {
    const result: Record<string, Parameter> = {};
    for (const [name, property] of Object.entries(properties)) {
        console.log(name, property);
        const id = crypto.randomUUID();
        const param: Parameter = {
            id,
            name,
            type: property.type,
            description: (property.description || '') as string,
            required: Boolean(property.required),
            items: property.items,
            parent: parentId
        };
        if (property.properties) {
            // 递归处理子参数
            const childParams = convertToParameterWithId(property.properties, param.id);
            // 将子参数添加到结果中
            Object.assign(result, childParams);
        }

        result[id] = param;
    }

    return result;
};

/** 将带有id的参数结构转换回普通参数 */
const convertToToolProperty = (parameters: Record<string, Parameter>): Record<string, ToolProperty> => {
    const result: Record<string, ToolProperty> = {};
    const paramsByParent: Record<string, Parameter[]> = {};

    // 按父参数ID分组
    Object.values(parameters).forEach(param => {
        const parentId = param.parent || 'root';
        if (!paramsByParent[parentId]) {
            paramsByParent[parentId] = [];
        }
        paramsByParent[parentId].push(param);
    });

    // 处理顶级参数（没有父参数的）
    (paramsByParent['root'] || []).forEach(param => {
        const property: ToolProperty = {
            type: param.type,
            description: param.description,
        };

        if (param.required) {
            property.required = param.required;
        }

        if (param.type === 'array' && param.items) {
            property.items = param.items;
        } else if (param.type === 'object') {
            // 查找该参数的所有子参数
            const childParams = paramsByParent[param.id];
            if (childParams && childParams.length > 0) {
                property.properties = {};
                // 为每个子参数创建一个新的参数对象
                childParams.forEach(child => {
                    property.properties![child.name] = {
                        type: child.type,
                        description: child.description,
                        required: child.required,
                        ...(child.type === 'array' && child.items && { items: child.items }),
                        ...(child.type === 'object' && {
                            properties: convertToToolProperty({
                                [child.id]: { ...child, parent: undefined }
                            })
                        })
                    };
                });
            }
        }

        result[param.name] = property;
    });

    return result;
};

interface ParameterItemProps {
    param: Parameter;
    parameters: Record<string, Parameter>;
    index: number;
    level?: number;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof Parameter, value: any) => void;
    onAdd: (parentId?: string) => void;
    onTestArgChange: (name: string, value: string) => void;
}

const ParameterItem: React.FC<ParameterItemProps> = ({
    param,
    level = 0,
    onRemove,
    onUpdate,
    onAdd,
    parameters,
    onTestArgChange
}) => {
    // 获取子参数
    const items = Object.values(parameters).filter(p => p.parent === param.id);

    return (
        <div className={`p-3 bg-primary/5 rounded-md space-y-2`}>
            <div className="flex justify-between items-center">
                <div className="flex-1 flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => onUpdate(param.id, "required", e.target.checked)}
                        className="w-3 h-3"
                    />
                    <span className="text-xs text-muted-foreground">必填</span>
                </div>
                <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onRemove(param.id)}
                >
                    <TbTrash className="w-3 h-3" />
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Input
                    value={param.name}
                    onChange={(e) => onUpdate(param.id, "name", e.target.value)}
                    variant="background"
                    placeholder="参数名称"
                />
                <div className="flex items-center gap-2">
                    <Select
                        value={param.type}
                        onValueChange={(value) => onUpdate(param.id, "type", value)}
                    >
                        <SelectTrigger variant="background">
                            <SelectValue placeholder="请选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                            {[
                                {
                                    label: "字符串",
                                    value: "string"
                                },
                                {
                                    label: "数字",
                                    value: "number"
                                },
                                {
                                    label: "布尔值",
                                    value: "boolean"
                                },
                                {
                                    label: "对象",
                                    value: "object"
                                },
                                {
                                    label: "数组",
                                    value: "array"
                                }
                            ].map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {param.type === "array" && (
                        <Select
                            value={(param.items as { type: string })?.type || "string"}
                            onValueChange={(value) => onUpdate(param.id, "items", { type: value })}
                        >
                            <SelectTrigger className="text-xs h-8">
                                <SelectValue placeholder="请选择类型" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="string">字符串数组</SelectItem>
                                <SelectItem value="number">数字数组</SelectItem>
                                <SelectItem value="boolean">布尔值数组</SelectItem>
                                <SelectItem value="object">对象数组</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
                <Input
                    value={param.description}
                    onChange={(e) => onUpdate(param.id, "description", e.target.value)}
                    variant="background"
                    placeholder="参数描述"
                />
                <Input
                    onChange={(e) => onTestArgChange(param.id, e.target.value)}
                    variant="background"
                    placeholder="测试参数"
                />
            </div>

            <div className="flex gap-2 items-center">
                {param.type === "object" && (
                    <Button
                        variant="ghost"
                        onClick={() => onAdd(param.id)}
                        className="flex items-center gap-1 px-2 h-6 text-xs text-muted-foreground hover:bg-background rounded transition-colors"
                    >
                        <TbPlus className="w-3 h-3" />
                        添加子参数
                    </Button>
                )}

            </div>
            {param.type === "object" && items.length > 0 && (
                <div className="mt-2 pl-4 space-y-2">
                    {items.map((childParam, childIndex) => {
                        return (
                            <ParameterItem
                                key={childParam.id}
                                parameters={parameters}
                                param={childParam}
                                index={childIndex}
                                level={level + 1}
                                onRemove={onRemove}
                                onUpdate={onUpdate}
                                onAdd={onAdd}
                                onTestArgChange={onTestArgChange}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export function ToolEdit() {
    /* 插件名称 */
    const [name, setName] = useState("");
    /* 插件描述 */
    const [description, setDescription] = useState("");
    /* 插件脚本 */
    const [scriptContent, setScriptContent] = useState("");
    /* 插件参数 */
    const [parameters, setParameters] = useState<Record<string, Parameter>>({});
    /* 是否提交中 */
    const [isSubmitting, setIsSubmitting] = useState(false);
    /* 输入框 */
    const inputRef = useRef<HTMLInputElement>(null);
    /* 是否创建 */
    const [create, setCreate] = useState(true);
    /* 测试参数 */
    const [testArgs, setTestArgs] = useState<Record<string, any>>({});
    /* 依赖包 */
    const [dependencies, setDependencies] = useState<string[]>([]);
    /* 已安装的包 */
    const [packages, setPackages] = useState<PackageInfo[]>([]);
    /* 查询地址参数 */
    const query = useQuery("name");
    /* 工具 */
    const tools = ToolsManager.use();
    // 加载已安装的包
    const loadPackages = async () => {
        try {
            const pkgs = await BundleManager.getAllBundles();
            console.log(pkgs);
            setPackages(pkgs);
        } catch (error) {
            console.error("加载包列表失败:", error);
            cmd.message(String(error), "错误", "error");
        }
    };

    useEffect(() => {
        loadPackages();
    }, []);


    useEffect(() => {
        inputRef.current?.focus();
        if (query) {
            const toolData = tools[query];
            if (toolData) {
                setCreate(false);
                setName(toolData.name);
                setDescription(toolData.description || "");
                setScriptContent(toolData.script);
                setDependencies(toolData.dependencies);
                console.log(toolData.parameters);
                const params = convertToParameterWithId(toolData.parameters.properties);
                console.log(params);
                setParameters(params);
            } else {
                setCreate(true);
                setName("");
                setDescription("");
                setScriptContent("");
                setParameters({});
            }
        } else {
            setCreate(true);
            setName("");
            setDescription("");
            setScriptContent("");
            setParameters({});
        }
    }, [query, tools]);

    const handleClose = async () => {
        setName("");
        setDescription("");
        setScriptContent("");
        setParameters({});
        cmd.close();
    };

    const addArg = (parentId?: string) => {
        setParameters(prev => {
            const newId = crypto.randomUUID();
            const baseProperty: Parameter = {
                id: newId,
                name: "",
                type: "string",
                description: "",
                required: false,
                parent: parentId
            };



            return { ...prev, [newId]: baseProperty };
        });
    };

    const removeArg = (id: string) => {
        setParameters(prev => {
            const result = { ...prev };
            // 递归删除所有子参数
            const removeChildParams = (parentId: string) => {
                Object.keys(result).forEach(key => {
                    if (result[key].parent === parentId) {
                        removeChildParams(result[key].id);
                        delete result[key];
                    }
                });
            };

            // 删除目标参数及其所有子参数
            removeChildParams(id);
            delete result[id];

            return result;
        });

        // 同步清理testArgs中的相关数据
        setTestArgs(prev => {
            const newTestArgs = { ...prev };
            const paramToRemove = parameters[id];
            if (paramToRemove) {
                delete newTestArgs[paramToRemove.name];
            }
            return newTestArgs;
        });
    };

    const updateArg = (id: string, field: keyof Parameter, value: any) => {
        setParameters(prev => {
            const result = { ...prev };
            const param = result[id];

            // 如果是更新参数名称
            if (field === "name") {
                // 只更新当前参数的名称
                result[id] = { ...param, name: value };

                return result;
            }

            // 如果是更新参数类型
            if (field === "type") {
                if (value === "array") {
                    // 如果切换到数组类型，确保有默认的items设置
                    result[id] = {
                        ...result[id],
                        [field]: value,
                        items: { type: "string" }
                    };
                    // 清理可能存在的子参数
                    Object.keys(result).forEach(key => {
                        if (result[key].parent === id) {
                            delete result[key];
                        }
                    });
                    return result;
                } else if (value === "object") {
                    // 对象类型可以有子参数，不需要特殊处理
                    result[id] = { ...result[id], [field]: value };
                    return result;
                } else if (param.type === "object" || param.type === "array") {
                    // 从复杂类型切换到简单类型，清理子参数和items
                    Object.keys(result).forEach(key => {
                        if (result[key].parent === id) {
                            delete result[key];
                        }
                    });
                    const updatedParam = { ...result[id], [field]: value };
                    delete updatedParam.items;
                    result[id] = updatedParam;
                    return result;
                }
            }

            result[id] = { ...result[id], [field]: value };
            return result;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // 转换为提交格式
        const properties = convertToToolProperty(parameters);

        const toolData: ToolProps = {
            name,
            description,
            script: scriptContent,
            dependencies,
            parameters: {
                type: "object",
                properties,
                required: Object.values(parameters)
                    .filter(p => p.required)
                    .map(p => p.name)
            }
        };

        try {
            setIsSubmitting(true);
            if (create) {
                await ToolsManager.add(toolData);
            } else {
                if (!name) return;
                await ToolsManager.update(name, toolData);
            }
            await handleClose();
        } catch (error) {
            console.error(create ? "添加插件失败:" : "更新插件失败:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTestArgChange = (id: string, value: string) => {
        setTestArgs(prev => ({ ...prev, [id]: value }));
    };

    const test = async () => {
        try {
            const argsObject = Object.values(parameters).reduce<Record<string, any>>((acc, param) => {
                const value = testArgs[param.id];
                if (param.required && !value) {
                    throw new Error(`参数 ${param.name} 不能为空`);
                }
                acc[param.name] = value;
                return acc;
            }, {});

            // 直接使用当前编辑的脚本和依赖进行测试
            const result = await ToolsManager.executeTool(name, argsObject, {
                script: scriptContent,
                dependencies
            });

            console.log(result);
            cmd.message(JSON.stringify(result), "测试结果");
        } catch (error) {
            console.log(error);
            cmd.message(String(error), "测试失败", 'warning');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header title={create ? "添加插件" : "编辑插件"} close={handleClose} />

            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">插件名称</label>
                        <Input
                            ref={inputRef}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="输入插件名称"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">插件描述</label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="输入插件描述"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">依赖包</label>
                        <MultiSelect
                            options={packages.map(pkg => ({
                                label: `${pkg.name} (${pkg.version})`,
                                value: pkg.name
                            }))}
                            value={dependencies}
                            onChange={setDependencies}
                            className="bg-secondary"
                            placeholder="选择依赖包..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-muted-foreground">脚本内容</label>
                        <Textarea
                            value={scriptContent}
                            onChange={(e) => setScriptContent(e)}
                            className="w-full px-3 py-2 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none min-h-[160px] resize-none placeholder:text-muted-foreground"
                            placeholder="输入js脚本内容"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs text-muted-foreground">参数列表</label>
                            <Button
                                className="text-xs"
                                onClick={() => addArg()}
                            >
                                <TbPlus className="w-3 h-3" />
                                添加参数
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {Object.values(parameters)
                                .filter(p => !p.parent)
                                .map((param, index) => (
                                    <ParameterItem
                                        key={param.id}
                                        param={param}
                                        index={index}
                                        parameters={parameters}
                                        onRemove={removeArg}
                                        onUpdate={updateArg}
                                        onAdd={addArg}
                                        onTestArgChange={handleTestArgChange}
                                    />
                                ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
                <Button
                    onClick={test}
                    className="mr-auto"
                >
                    测试
                </Button>
                <Button
                    onClick={handleClose}
                >
                    取消
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!name || !scriptContent || isSubmitting}
                >
                    {isSubmitting ? (create ? "创建中..." : "更新中...") : create ? "创建" : "更新"}
                </Button>
            </div>
        </div>
    );
}

ToolEdit.open = (name?: string) => {
    cmd.open("plugin-edit", { name }, { width: 500, height: 600 });
};
