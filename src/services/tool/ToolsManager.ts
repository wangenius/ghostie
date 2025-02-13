import { cmd } from "@/utils/shell";
import {
  ToolFunction,
  ToolFunctionHandler,
  ToolFunctionInfo,
  ToolProps,
  ToolProperty,
} from "@/common/types/model";
import { Echo } from "echo-state";

/* 工具管理器 */
export class ToolsManager {
  private static tools: Record<string, ToolProps> = {};

  static async getAll(): Promise<Record<string, ToolProps>> {
    try {
      console.log("调用 list_deno_plugins");
      const plugins = await cmd.invoke<ToolProps[]>("list_deno_plugins");
      console.log("list_deno_plugins 返回:", plugins);
      this.tools = plugins.reduce((acc, plugin) => {
        acc[plugin.name] = plugin;
        return acc;
      }, {} as Record<string, ToolProps>);
      console.log("处理后的工具列表:", this.tools);
      return this.tools;
    } catch (error) {
      console.error("获取插件列表失败:", error);
      throw error;
    }
  }

  static async add(tool: ToolProps) {
    try {
      await cmd.invoke("register_deno_plugin", {
        name: tool.name,
        description: tool.description,
        script: tool.content,
        dependencies: tool.dependencies || [],
      });
      await this.getAll(); // 刷新本地缓存
    } catch (error) {
      console.error("添加插件失败:", error);
      throw error;
    }
  }

  static async remove(name: string) {
    try {
      await cmd.invoke("remove_deno_plugin", { name });
      await this.getAll(); // 刷新本地缓存
    } catch (error) {
      console.error("删除插件失败:", error);
      throw error;
    }
  }

  /**
   * 获取工具函数信息
   */
  static get(names: ToolFunctionHandler[]): ToolFunctionInfo[] {
    return names
      .map((n) => {
        const name =
          typeof n === "string" || typeof n === "symbol"
            ? n.toString()
            : typeof n === "function"
            ? n.name
            : typeof n === "object" && n !== null && typeof n.name === "string"
            ? n.name
            : undefined;

        if (!name) return undefined;

        const tool = this.getTool(name);
        if (!tool) return undefined;

        // 构建标准的参数结构
        const properties: Record<string, ToolProperty> = {};
        if (tool.parameters) {
          for (const [key, value] of Object.entries(tool.parameters)) {
            if (this.isValidToolProperty(value)) {
              properties[key] = value;
            }
          }
        }

        return {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object" as const,
            properties,
            required: Object.entries(tool.parameters || {})
              .filter(([_, value]) => value.required)
              .map(([key]) => key),
          },
        };
      })
      .filter((tool): tool is ToolFunctionInfo => tool !== undefined);
  }

  /**
   * 验证参数属性是否有效
   */
  private static isValidToolProperty(value: any): value is ToolProperty {
    return (
      value &&
      typeof value === "object" &&
      typeof value.type === "string" &&
      ["string", "number", "boolean", "array", "object"].includes(value.type)
    );
  }

  /**
   * 从store加载工具函数
   */
  private static loadToolFunction(name: string): ToolProps | undefined {
    return this.tools[name];
  }

  /**
   * 注册工具函数
   */
  static registerTool(toolFunction: ToolFunction) {
    const tool: ToolProps = {
      name: toolFunction.info.name,
      description: toolFunction.info.description,
      content: toolFunction.fn.toString(),
      dependencies: [],
      parameters: toolFunction.info.parameters.properties,
    };
    this.tools[toolFunction.info.name] = tool;
  }

  /**
   * 获取所有工具函数信息
   */
  static getAllTools(): ToolFunctionInfo[] {
    return Object.values(this.tools).map(
      (tool): ToolFunctionInfo => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object" as const,
          properties: tool.parameters || {},
          required: Object.entries(tool.parameters || {})
            .filter(([_, value]) => value.required)
            .map(([key]) => key),
        },
      })
    );
  }

  /**
   * 获取指定工具函数
   */
  static getTool(name: string): ToolProps | undefined {
    return this.loadToolFunction(name);
  }

  static async update(oldName: string, tool: ToolProps) {
    await this.remove(oldName);
    await this.add(tool);
  }

  static async importFromJSON() {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "选择插件文件",
          filters: {
            插件文件: ["json"],
          },
        }
      );

      if (result) {
        const importedPlugins = JSON.parse(result.content) as ToolProps[];
        for (const plugin of importedPlugins) {
          await this.add(plugin);
        }
        cmd.message(`成功导入 ${importedPlugins.length} 个插件`, "导入成功");
      }
    } catch (error) {
      console.error("导入插件失败:", error);
      cmd.message(`导入插件失败: ${error}`, "导入失败");
    }
  }

  static async importTSModule() {
    // try {
    //   // 打开文件选择对话框
    //   const result = await cmd.invoke<{ path: string; content: string }>(
    //     "open_file",
    //     {
    //       title: "选择工具文件",
    //       filters: {
    //         TypeScript文件: ["ts"],
    //       },
    //     }
    //   );
    //   if (result) {
    //     try {
    //       const content = result.content;
    //       // 创建源文件
    //       const sourceFile = ts.createSourceFile(
    //         "temp.ts",
    //         content,
    //         ts.ScriptTarget.Latest,
    //         true
    //       );
    //       const tools: ToolProps[] = [];
    //       // 解析对象字面量表达式
    //       function parseObjectLiteral(
    //         node: ts.ObjectLiteralExpression
    //       ): Record<string, any> {
    //         const obj: Record<string, any> = {};
    //         node.properties.forEach((prop) => {
    //           if (ts.isPropertyAssignment(prop)) {
    //             const name = prop.name.getText();
    //             if (ts.isObjectLiteralExpression(prop.initializer)) {
    //               obj[name] = parseObjectLiteral(prop.initializer);
    //             } else {
    //               const value = prop.initializer.getText();
    //               // 处理字符串字面量
    //               if (ts.isStringLiteral(prop.initializer)) {
    //                 obj[name] = prop.initializer.text;
    //               }
    //               // 处理布尔值
    //               else if (value === "true") {
    //                 obj[name] = true;
    //               } else if (value === "false") {
    //                 obj[name] = false;
    //               }
    //               // 处理数字
    //               else if (!isNaN(Number(value))) {
    //                 obj[name] = Number(value);
    //               }
    //               // 其他情况保持原样
    //               else {
    //                 obj[name] = value;
    //               }
    //             }
    //           }
    //         });
    //         return obj;
    //       }
    //       // 遍历AST
    //       function visit(node: ts.Node) {
    //         if (ts.isClassDeclaration(node) && node.name) {
    //           // 遍历类的成员
    //           node.members.forEach((member) => {
    //             if (
    //               ts.isMethodDeclaration(member) &&
    //               member.modifiers?.some(
    //                 (mod) =>
    //                   mod.kind === ts.SyntaxKind.StaticKeyword &&
    //                   ts.getDecorators?.(member)?.length
    //               )
    //             ) {
    //               const decorators = ts.getDecorators?.(member) || [];
    //               // 查找@register装饰器
    //               const registerDecorator = decorators.find(
    //                 (dec: ts.Decorator) => {
    //                   const expr = dec.expression;
    //                   return (
    //                     ts.isCallExpression(expr) &&
    //                     ts.isIdentifier(expr.expression) &&
    //                     expr.expression.text === "register"
    //                   );
    //                 }
    //               );
    //               if (
    //                 registerDecorator &&
    //                 ts.isCallExpression(registerDecorator.expression)
    //               ) {
    //                 const args = registerDecorator.expression.arguments;
    //                 if (args.length > 0) {
    //                   const description = (args[0] as ts.StringLiteral).text;
    //                   const argsObject =
    //                     args[1] && ts.isObjectLiteralExpression(args[1])
    //                       ? parseObjectLiteral(args[1])
    //                       : {};
    //                   // 获取方法名
    //                   const methodName = (member.name as ts.Identifier).text;
    //                   // 获取方法体
    //                   const body = member.body;
    //                   if (!body) {
    //                     throw new Error(`方法体为空: ${methodName}`);
    //                   }
    //                   // 构建tool对象
    //                   const tool: ToolProps = {
    //                     name: methodName,
    //                     description: description,
    //                     parameters: {
    //                       type: "object",
    //                       properties: argsObject,
    //                       required: Object.entries(argsObject)
    //                         .filter(([_, value]) => value.required !== false)
    //                         .map(([key, _]) => key),
    //                     },
    //                     script: ts
    //                       .transpileModule(body.getText(), {
    //                         compilerOptions: {
    //                           target: ts.ScriptTarget.ESNext,
    //                           module: ts.ModuleKind.None,
    //                           removeComments: true,
    //                         },
    //                       })
    //                       .outputText.replace(/^\s*{/, "")
    //                       .replace(/}\s*$/, "")
    //                       .replace(/export {};?/, "")
    //                       .trim(),
    //                     dependencies: [],
    //                   };
    //                   tools.push(tool);
    //                 }
    //               }
    //             }
    //           });
    //         }
    //         ts.forEachChild(node, visit);
    //       }
    //       // 开始遍历
    //       visit(sourceFile);
    //       if (tools.length === 0) {
    //         throw new Error("未找到有效的工具方法");
    //       }
    //       // 添加所有工具
    //       for (const tool of tools) {
    //         await ToolsManager.add(tool);
    //       }
    //       cmd.message(`成功导入 ${tools.length} 个工具`, "导入成功");
    //     } catch (error) {
    //       console.error("解析工具文件失败:", error);
    //       cmd.message(`解析工具文件失败: ${error}`, "导入失败");
    //     }
    //   }
    // } catch (error) {
    //   console.error("导入工具失败:", error);
    //   cmd.message(`导入工具失败: ${error}`, "导入失败");
    // }
  }

  static async exportToJSON() {
    try {
      const toolsToExport = Object.values(this.tools).filter(Boolean);
      const toolsJson = JSON.stringify(toolsToExport, null, 2);

      const result = await cmd.invoke<boolean>("save_file", {
        title: "保存工具文件",
        filters: {
          工具文件: ["json"],
        },
        defaultName: "tools.json",
        content: toolsJson,
      });

      if (result) {
        cmd.message(`成功导出 ${toolsToExport.length} 个工具`, "导出成功");
      }
    } catch (error) {
      console.error("导出插件失败:", error);
      cmd.message(`导出插件失败: ${error}`, "导出失败");
    }
  }
}
