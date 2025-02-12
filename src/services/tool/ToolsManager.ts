import { BundleManager } from "@/services/bundle/BundleManager";
import { cmd } from "@/utils/shell";
import {
  ToolFunction,
  ToolFunctionHandler,
  ToolFunctionInfo,
  ToolProps,
} from "@common/types/model";
import { Echo } from "echo-state";
import ts from "typescript";

/* 工具管理器 */
export class ToolsManager {
  /* 保存所有的工具 */
  static store = new Echo<Record<string, ToolProps>>(
    {},
    {
      name: "tools",
      sync: true,
    }
  );

  static use = this.store.use.bind(this.store);

  static async exe(functionCall: {
    name: string;
    arguments: Record<string, any>;
  }): Promise<any> {
    return await ToolsManager.executeTool(
      functionCall.name,
      functionCall.arguments
    );
  }

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
          return ToolsManager.getTool(n.toString());
        }

        // 如果是函数或方法
        if (
          typeof n === "function" ||
          (typeof n === "object" && n !== null && typeof n.name === "string")
        ) {
          const name = typeof n === "function" ? n.name : n.name;
          return ToolsManager.getTool(name);
        }

        return undefined;
      })
      .filter((tool) => tool !== undefined) as ToolFunctionInfo[];
  }
  /**
   * 从store加载工具函数到缓存
   */
  private static loadToolFunction(name: string): ToolProps | undefined {
    const tools = this.store.current;
    const tool = tools[name];
    if (!tool) return undefined;
    return tool;
  }

  /**
   * 注册工具函数
   */
  static registerTool(toolFunction: ToolFunction) {
    // 只更新store，不更新缓存
    const tool: ToolProps = {
      ...toolFunction.info,
      script: toolFunction.fn.toString(),
      dependencies: [],
    };
    this.store.set({
      [toolFunction.info.name]: tool,
    });
  }

  /**
   * 获取所有工具函数信息
   */
  static getAllTools(): ToolFunctionInfo[] {
    // 直接从store中获取
    const tools = this.store.current;
    return Object.values(tools).map((tool) => {
      const { script, ...info } = tool;
      return info;
    });
  }

  /**
   * 获取指定工具函数
   */
  static getTool(name: string): ToolProps | undefined {
    // 先从缓存中查找
    let tool = this.loadToolFunction(name);
    if (!tool) {
      throw new Error(`工具函数 ${name} 不存在`);
    }
    return tool;
  }

  /**
   * 执行工具函数
   */
  static async executeTool(
    name: string,
    args: Record<string, any>,
    options?: {
      script?: string;
      dependencies?: string[];
    }
  ): Promise<any> {
    const tool = this.getTool(name);
    console.log(tool);
    if (!tool) {
      throw new Error(`工具函数 ${name} 不存在`);
    }

    try {
      // 解析依赖
      const deps = options?.dependencies || tool.dependencies || [];
      const wrappedScript = `
        return (async function(params) {
          ${deps
            .map((dep: string) => {
              const varName = dep.replace("@", "").replace(/-/g, "_");
              return `const ${varName} = await this.getDep('${dep}');
                    if (typeof ${varName} === 'object' && ${varName}.default) {
                        Object.assign(${varName}, ${varName}.default);
                    }`;
            })
            .join("\n")}
          ${options?.script || tool.script}
        }).call(this, params);
      `;

      console.log(wrappedScript);

      const fn = new Function("params", wrappedScript).bind({
        getDep: async (name: string) => {
          try {
            // 先从 IndexDB 获取
            const bundle = await BundleManager.getBundle(name);
            if (!bundle) {
              throw new Error(`模块 ${name} 未找到，请先安装`);
            }
            // 执行打包后的代码
            const executeModule = new Function(`
              try {
                ${bundle}
                return window.__MODULE__;
              } finally {
                delete window.__MODULE__;
              }
            `);

            const mod = executeModule();
            if (!mod) {
              throw new Error(`模块 ${name} 加载失败`);
            }

            return mod;
          } catch (error) {
            console.error(`加载模块 ${name} 失败:`, error);
            throw error;
          }
        },
      }) as (args: Record<string, any>) => Promise<any>;

      // 类型转换函数
      const convertValue = (value: string, type: string): any => {
        if (value === undefined || value === null || value === "")
          return undefined;

        switch (type) {
          case "number":
            return Number(value);
          case "boolean":
            return value.toLowerCase() === "true";
          case "array":
            try {
              return JSON.parse(value);
            } catch {
              return value.split(",").map((v) => v.trim());
            }
          case "object":
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          default:
            return value;
        }
      };

      // 转换参数类型
      const convertedArgs = Object.entries(args).reduce<Record<string, any>>(
        (acc, [key, value]) => {
          const paramType = tool.parameters?.properties?.[key]?.type;
          if (paramType) {
            acc[key] = convertValue(value, paramType);
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {}
      );

      // 执行函数并返回结果
      return await fn(convertedArgs);
    } catch (error) {
      console.error(`执行工具函数 ${name} 失败:`, error);
      throw error;
    }
  }

  static async add(tool: ToolProps) {
    this.store.set({
      [tool.name]: tool,
    });
  }

  static async delete(name: string) {
    this.store.delete(name);
  }

  static async update(oldName: string, tool: ToolProps) {
    await this.delete(oldName);
    await this.add(tool);
  }

  static async run(name: string, args?: Record<string, any>) {
    return await this.executeTool(name, args || {});
  }

  static async remove(name: string) {
    const answer = await cmd.confirm(`确定要删除工具 "${name}" 吗？`);

    if (answer) {
      try {
        await ToolsManager.delete(name);
      } catch (error) {
        console.error("删除插件失败:", error);
      }
    }
  }

  static async importFromJSON() {
    try {
      // 打开文件选择对话框
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
        // 解析插件文件
        const importedPlugins = JSON.parse(result.content) as ToolProps[];

        // 导入每个插件
        for (const plugin of importedPlugins) {
          await ToolsManager.add(plugin);
        }

        cmd.message(`成功导入 ${importedPlugins.length} 个插件`, "导入成功");
      }
    } catch (error) {
      console.error("导入插件失败:", error);
      cmd.message(`导入插件失败: ${error}`, "导入失败");
    }
  }

  static async importTSModule() {
    try {
      // 打开文件选择对话框
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "选择工具文件",
          filters: {
            TypeScript文件: ["ts"],
          },
        }
      );

      if (result) {
        try {
          const content = result.content;

          // 创建源文件
          const sourceFile = ts.createSourceFile(
            "temp.ts",
            content,
            ts.ScriptTarget.Latest,
            true
          );

          const tools: ToolProps[] = [];

          // 解析对象字面量表达式
          function parseObjectLiteral(
            node: ts.ObjectLiteralExpression
          ): Record<string, any> {
            const obj: Record<string, any> = {};
            node.properties.forEach((prop) => {
              if (ts.isPropertyAssignment(prop)) {
                const name = prop.name.getText();
                if (ts.isObjectLiteralExpression(prop.initializer)) {
                  obj[name] = parseObjectLiteral(prop.initializer);
                } else {
                  const value = prop.initializer.getText();
                  // 处理字符串字面量
                  if (ts.isStringLiteral(prop.initializer)) {
                    obj[name] = prop.initializer.text;
                  }
                  // 处理布尔值
                  else if (value === "true") {
                    obj[name] = true;
                  } else if (value === "false") {
                    obj[name] = false;
                  }
                  // 处理数字
                  else if (!isNaN(Number(value))) {
                    obj[name] = Number(value);
                  }
                  // 其他情况保持原样
                  else {
                    obj[name] = value;
                  }
                }
              }
            });
            return obj;
          }

          // 遍历AST
          function visit(node: ts.Node) {
            if (ts.isClassDeclaration(node) && node.name) {
              // 遍历类的成员
              node.members.forEach((member) => {
                if (
                  ts.isMethodDeclaration(member) &&
                  member.modifiers?.some(
                    (mod) =>
                      mod.kind === ts.SyntaxKind.StaticKeyword &&
                      ts.getDecorators?.(member)?.length
                  )
                ) {
                  const decorators = ts.getDecorators?.(member) || [];
                  // 查找@register装饰器
                  const registerDecorator = decorators.find(
                    (dec: ts.Decorator) => {
                      const expr = dec.expression;
                      return (
                        ts.isCallExpression(expr) &&
                        ts.isIdentifier(expr.expression) &&
                        expr.expression.text === "register"
                      );
                    }
                  );

                  if (
                    registerDecorator &&
                    ts.isCallExpression(registerDecorator.expression)
                  ) {
                    const args = registerDecorator.expression.arguments;
                    if (args.length > 0) {
                      const description = (args[0] as ts.StringLiteral).text;
                      const argsObject =
                        args[1] && ts.isObjectLiteralExpression(args[1])
                          ? parseObjectLiteral(args[1])
                          : {};
                      // 获取方法名
                      const methodName = (member.name as ts.Identifier).text;
                      // 获取方法体
                      const body = member.body;
                      if (!body) {
                        throw new Error(`方法体为空: ${methodName}`);
                      }

                      // 构建tool对象
                      const tool: ToolProps = {
                        name: methodName,
                        description: description,
                        parameters: {
                          type: "object",
                          properties: argsObject,
                          required: Object.entries(argsObject)
                            .filter(([_, value]) => value.required !== false)
                            .map(([key, _]) => key),
                        },
                        script: ts
                          .transpileModule(body.getText(), {
                            compilerOptions: {
                              target: ts.ScriptTarget.ESNext,
                              module: ts.ModuleKind.None,
                              removeComments: true,
                            },
                          })
                          .outputText.replace(/^\s*{/, "")
                          .replace(/}\s*$/, "")
                          .replace(/export {};?/, "")
                          .trim(),
                        dependencies: [],
                      };
                      tools.push(tool);
                    }
                  }
                }
              });
            }
            ts.forEachChild(node, visit);
          }

          // 开始遍历
          visit(sourceFile);

          if (tools.length === 0) {
            throw new Error("未找到有效的工具方法");
          }

          // 添加所有工具
          for (const tool of tools) {
            await ToolsManager.add(tool);
          }

          cmd.message(`成功导入 ${tools.length} 个工具`, "导入成功");
        } catch (error) {
          console.error("解析工具文件失败:", error);
          cmd.message(`解析工具文件失败: ${error}`, "导入失败");
        }
      }
    } catch (error) {
      console.error("导入工具失败:", error);
      cmd.message(`导入工具失败: ${error}`, "导入失败");
    }
  }

  static async exportToJSON() {
    try {
      // 获取所有插件数据
      const toolsToExport = Object.values(this.store.current).filter(Boolean);

      // 转换为 JSON
      const toolsJson = JSON.stringify(toolsToExport, null, 2);

      // 打开保存文件对话框
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
