import { ToolFunction, ToolProperty } from "@common/types/model";
import { ToolsManager } from "./ToolsManager";

/**
 * 工具函数装饰器
 * @param description 工具函数描述
 * @param properties 工具函数参数
 * @returns 工具函数装饰器
 */
export function register<TArgs = any, TResult = any>(
  description: string,
  properties: Record<string, ToolProperty> = {}
): MethodDecorator {
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
          ),
        },
      },
      fn: originalMethod,
    };

    /* 注册到 ToolsManager */
    ToolsManager.registerTool(toolFunction);

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
