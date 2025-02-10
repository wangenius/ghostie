import {
    ToolFunction,
    ToolFunctionHandler,
    ToolFunctionInfo,
    ToolProperty
} from "@common/types/model";

/**
 * 工具函数装饰器

 * @param description 工具函数描述
 * @param properties 工具函数参数
 * @returns 工具函数装饰器
 */
export function tool<TArgs = any, TResult = any>(
    description: string,
    properties: Record<string, ToolProperty>
): MethodDecorator {
    /* 工具函数装饰器 */
    return function (
        _: object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ): PropertyDescriptor {
        const originalMethod = descriptor.value;
        const name = propertyKey.toString();

        const toolFunction: ToolFunction<TArgs, TResult> = {
            info: {
                description: description,
                name: name,
                parameters: {
                    type: "object",
                    properties: properties,
                    required: Object.keys(properties).filter(
                        (property) => properties[property].required
                    )
                }
            },
            fn: originalMethod
        };

        /* 设置工具函数 */
        Tool.set(name, toolFunction);

        /* 返回增强的方法 */
        const enhancedMethod = function (this: any, ...args: any[]) {
            return originalMethod.apply(this, args);
        };
        Object.defineProperty(enhancedMethod, "name", { value: name });
        Object.assign(enhancedMethod, toolFunction);

        descriptor.value = enhancedMethod;
        return descriptor;
    };
}

export class Tool {
    /**
     * 工具函数注册表
     */
    static ToolStore = new Map<string, ToolFunction>();

    /**
     * 获取工具函数信息
     * @param names 工具函数名称
     * @returns 工具函数信息
     */
    static get(names: ToolFunctionHandler[]): ToolFunctionInfo[] {
        return names
            .map((n) => {
                // 如果是字符串或symbol
                if (typeof n === "string" || typeof n === "symbol") {
                    return Tool.ToolStore.get(n.toString())?.info;
                }

                // 如果是函数或方法
                if (
                    typeof n === "function" ||
                    (typeof n === "object" && n !== null && typeof n.name === "string")
                ) {
                    // 尝试直接从ToolStore获取
                    const name = typeof n === "function" ? n.name : n.name;
                    const toolInfo = Tool.ToolStore.get(name)?.info;
                    if (toolInfo) {
                        return toolInfo;
                    }
                }

                return undefined;
            })
            .filter((tool) => tool !== undefined) as ToolFunctionInfo[];
    }

    static async exe(functionCall: { name: string; arguments: Record<string, any> }): Promise<any> {
        const tool = Tool.ToolStore.get(functionCall.name);
        if (!tool) {
            throw new Error(`Function ${functionCall.name} not found in registry`);
        }
        const result = await tool.fn(functionCall.arguments);
        return result;
    }

    static set(name: string, tool: ToolFunction) {
        Tool.ToolStore.set(name, tool);
    }
}
