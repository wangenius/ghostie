import { Header } from "@/components/custom/Header";
import { cmd } from "@/utils/shell";
import { useQuery } from "@hook/useQuery";
import { useEffect, useRef, useState } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { ToolsManager } from "../../services/tool/ToolsManager";
import { Button } from "@/components/ui/button";
import { PackageInfo, ToolProperty, ToolProps } from "@/common/types/model";

interface Parameter extends Omit<ToolProperty, "properties"> {
    id: string;
    name: string;
    parent?: string;
}

/** 将普通参数转换为带有id的参数结构 */
const convertToParameterWithId = (properties: Record<string, ToolProperty>, parentId?: string): Record<string, Parameter> => {
    const result: Record<string, Parameter> = {};
    // 如果传入的是单个ToolProperty，将其转换为Record格式
    console.log(properties);

    for (const [name, property] of Object.entries(properties)) {
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

        if (param.items) {
            if (typeof param.items === 'string' || 'type' in param.items) {
                property.items = param.items;
            } else {
                // 查找该参数的所有子参数
                const childParams = paramsByParent[param.id];
                if (childParams) {
                    const childProperties: Record<string, Parameter> = {};
                    childParams.forEach(child => {
                        childProperties[child.name] = child;
                    });
                    property.properties = convertToToolProperty(childProperties);
                }
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
    index,
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
        <div className={`p-3 bg-secondary rounded-md space-y-2`}>
            <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                    参数 {index + 1}
                </span>
                <button
                    onClick={() => onRemove(param.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                    <TbTrash className="w-3 h-3" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <input
                    type="text"
                    value={param.name}
                    onChange={(e) => onUpdate(param.id, "name", e.target.value)}
                    className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                    placeholder="参数名称"
                />
                <select
                    value={param.type}
                    onChange={(e) => onUpdate(param.id, "type", e.target.value)}
                    className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                >
                    <option value="string">字符串</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔值</option>
                    <option value="object">对象</option>
                    <option value="array">数组</option>
                </select>
                <input
                    type="text"
                    value={param.description}
                    onChange={(e) => onUpdate(param.id, "description", e.target.value)}
                    className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                    placeholder="参数描述"
                />
                <input
                    type="text"
                    onChange={(e) => onTestArgChange(param.id, e.target.value)}
                    className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                    placeholder="测试参数"
                />
            </div>

            <div className="flex gap-2 items-center">
                <div className="flex-1 flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => onUpdate(param.id, "required", e.target.checked)}
                        className="w-3 h-3"
                    />
                    <span className="text-xs text-muted-foreground">必填</span>
                </div>
                {param.type === "object" && (
                    <>
                        <div className="mt-2">
                            <button
                                onClick={() => onAdd(param.id)}
                                className="flex items-center gap-1 px-2 h-6 text-xs text-muted-foreground hover:bg-background rounded transition-colors"
                            >
                                <TbPlus className="w-3 h-3" />
                                添加子参数
                            </button>
                        </div>

                    </>
                )}
                {param.type === "array" && (
                    <div className="mt-2">
                        <select
                            value={(param.items as { type: string })?.type || "string"}
                            onChange={(e) => onUpdate(param.id, "items", { type: e.target.value })}
                            className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                        >
                            <option value="string">字符串数组</option>
                            <option value="number">数字数组</option>
                            <option value="boolean">布尔值数组</option>
                            <option value="object">对象数组</option>
                        </select>
                    </div>
                )}
            </div>
            <div>
                {items.length > 0 && (
                    <div className="mt-2 pl-4 space-y-2 border-l-2 border-border">
                        {items.map((childParam, childIndex) => {
                            return (
                                <ParameterItem
                                    key={`${param.id}-${childParam.name}`}
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
            const pkgs = await cmd.invoke<PackageInfo[]>("list_packages");
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
                const params = convertToParameterWithId(toolData.parameters.properties);
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

            if (parentId) {
                const parentParam = prev[parentId];
                if (!parentParam) return prev;
            }

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

            // 如果是更新参数名称，需要同步更新testArgs和子参数名称
            if (field === "name") {
                const oldName = param.name;
                // 更新测试参数
                setTestArgs(prevArgs => {
                    const newArgs = { ...prevArgs };
                    if (oldName in newArgs) {
                        newArgs[value] = newArgs[oldName];
                        delete newArgs[oldName];
                    }
                    return newArgs;
                });

                // 更新所有子参数的名称
                const updateChildNames = (parentId: string, parentNewName: string) => {
                    Object.keys(result).forEach(key => {
                        if (result[key].parent === parentId) {
                            const childParam = result[key];
                            const oldChildName = childParam.name;
                            const newChildName = oldChildName.replace(oldName, parentNewName);
                            result[key] = { ...childParam, name: newChildName };
                            // 递归更新子参数的名称
                            updateChildNames(key, newChildName);
                        }
                    });
                };
                updateChildNames(id, value);
            }

            // 如果是更新参数类型，且从object/array改为其他类型，需要清理子参数
            if (field === "type" &&
                (param.type === "object" || param.type === "array") &&
                (value !== "object" && value !== "array")) {
                Object.keys(result).forEach(key => {
                    if (result[key].parent === id) {
                        delete result[key];
                    }
                });
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
            // 解析依赖
            const deps = dependencies
            // 将脚本包装在异步函数中，使用 invoke 来调用依赖
            const wrappedScript = `
                return (async function(params) {
                    ${deps.map(dep => {
                const varName = dep.replace('@', "").replace(/-/g, "_");
                return `const ${varName} = await this.getDep('${dep}');
                        if (typeof ${varName} === 'object' && ${varName}.default) {
                            Object.assign(${varName}, ${varName}.default);
                        }`;
            }).join('\n')}
                    ${scriptContent}
                }).call(this, params);
            `;

            console.log(wrappedScript);

            const fn = new Function('params', wrappedScript).bind({
                getDep: async (name: string) => {
                    const bundledCode = await cmd.invoke<string>('get_npm_package', { name });
                    // 执行打包后的代码，它会在全局定义 __MODULE__
                    eval(bundledCode);
                    // @ts-ignore
                    const mod = window.__MODULE__;
                    // 清理全局变量
                    // @ts-ignore
                    delete window.__MODULE__;
                    return mod;
                }
            }) as (args: Record<string, any>) => Promise<any>;

            // 类型转换函数
            const convertValue = (value: string, type: string): any => {
                if (value === undefined || value === null || value === '') return undefined;

                switch (type) {
                    case 'number':
                        return Number(value);
                    case 'boolean':
                        return value.toLowerCase() === 'true';
                    case 'array':
                        try {
                            return JSON.parse(value);
                        } catch {
                            return value.split(',').map(v => v.trim());
                        }
                    case 'object':
                        try {
                            return JSON.parse(value);
                        } catch {
                            return value;
                        }
                    default:
                        return value;
                }
            };

            const argsObject = Object.values(parameters).reduce<Record<string, any>>((acc, param) => {
                const value = testArgs[param.id];
                if (param.required && !value) {
                    throw new Error(`参数 ${param.name} 不能为空`);
                }
                acc[param.name] = convertValue(value, param.type);
                return acc;
            }, {});

            // 执行函数并等待结果
            const result = await fn(argsObject);
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
                        <label className="block text-xs text-muted-foreground">依赖包</label>
                        <div className="flex flex-wrap gap-2 p-2 min-h-[40px] bg-secondary rounded-md">
                            {dependencies.map((dep) => (
                                <div
                                    key={dep}
                                    className="flex items-center gap-1 px-2 py-1 bg-background rounded text-xs"
                                >
                                    <span>{dep}</span>
                                    <button
                                        onClick={() => setDependencies(deps => deps.filter(d => d !== dep))}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <TbTrash className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <select
                                className="h-7 px-2 bg-background rounded text-xs focus:bg-background/80 transition-colors outline-none"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value && !dependencies.includes(value)) {
                                        setDependencies(deps => [...deps, value]);
                                    }
                                    e.target.value = '';
                                }}
                            >
                                <option value="">选择依赖包...</option>
                                {packages
                                    .filter(pkg => !dependencies.includes(pkg.name))
                                    .map(pkg => (
                                        <option key={pkg.name} value={pkg.name}>
                                            {pkg.name} ({pkg.version})
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
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
                                onClick={() => addArg()}
                                className="flex items-center gap-1 px-2 h-6 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
                            >
                                <TbPlus className="w-3 h-3" />
                                添加参数
                            </button>
                        </div>
                        <div className="space-y-3">
                            {Object.values(parameters)
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
