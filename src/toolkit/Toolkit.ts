import { TOOLKIT_DATABASE_INDEX } from "@/assets/const";
import { Echoi } from "@/lib/echo/Echo";
import { ImageManager } from "@/resources/Image";
import { ToolkitProps } from "@/toolkit/types";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { Echo } from "echo-state";
import { makeAutoObservable, toJS } from "mobx";
import ts from "typescript";
import { parsePluginFromString } from "./parser";

/* 默认 */
export const DEFAULT_TOOLKIT: ToolkitProps = {
  id: "",
  name: "",
  description: "",
  tools: [],
  version: "0.0.1",
};

// 插件存储
export const ToolkitStore = new Echoi<Record<string, ToolkitProps>>({}).indexed(
  {
    database: TOOLKIT_DATABASE_INDEX,
    name: "plugins",
  },
);

// 当前选中的插件ID
export const CurrentToolkitId = new Echoi<string>("");

export class Toolkit {
  props: ToolkitProps = DEFAULT_TOOLKIT;
  content: string = "";

  /** 构造函数 */
  constructor(plugin?: Partial<ToolkitProps>) {
    this.props = { ...DEFAULT_TOOLKIT, ...plugin };
    this.content = `/**
 * @name write the plugin name here
 * @description write the plugin description here
 */`;
    makeAutoObservable(this);
  }

  /** 创建插件或者获取插件 */
  static async create(config: Partial<ToolkitProps> = {}): Promise<Toolkit> {
    try {
      /* 生成ID */
      const id = config.id || gen.id();
      /* 创建插件实例 */
      const plugin = new Toolkit({ ...config, id });

      /* 从后端文件系统获取内容 */
      try {
        const content = await cmd.invoke<string>("plugin_get_content", { id });
        if (content) {
          plugin.content = content;
        } else {
          await cmd.invoke("plugin_save_content", {
            id: plugin.props.id,
            content: plugin.content,
          });
        }
      } catch (error) {
        await cmd.invoke("plugin_save_content", {
          id: plugin.props.id,
          content: plugin.content,
        });
      }

      return plugin;
    } catch (error) {
      console.error("Failed to create plugin:", error);
      throw error;
    }
  }

  /** 获取插件
   * 获取一个插件
   */
  static async get(id: string): Promise<Toolkit> {
    /* 获取插件 */
    const plugin = await ToolkitStore.getValue(id);
    /* 如果插件不存在 */
    if (!plugin) {
      throw new Error("Plugin not found");
    }
    const plug = new Toolkit(plugin);

    /* 从后端文件系统获取内容 */
    try {
      const content = await cmd.invoke<string>("plugin_get_content", { id });
      if (content) {
        plug.content = content;
      }
    } catch (error) {
      console.error("Failed to get plugin content:", error);
    }

    /* 返回插件 */
    return plug;
  }

  /** 更新插件 */
  async update(data: Partial<Omit<ToolkitProps, "id">>) {
    if (!this.props.id) return this;

    this.props = { ...this.props, ...data };
    ToolkitStore.set({
      [this.props.id]: toJS(this.props),
    });
    return this;
  }

  /** 处理插件内容
   * 解析插件内容并更新插件信息
   */
  async processContent(
    content: string,
  ): Promise<Pick<ToolkitProps, "name" | "description" | "tools" | "version">> {
    try {
      const parsedFunctions = parsePluginFromString(content);
      return {
        name: parsedFunctions.meta.name || "undefined",
        description: parsedFunctions.meta.description || "",
        version: parsedFunctions.meta.version || "0.0.1",
        tools: Object.values(parsedFunctions.tools).map((tool) => ({
          ...tool,
          plugin: this.props.id,
        })),
      };
    } catch (error) {
      console.error("处理插件内容时出错:", error);
      throw new Error("插件内容处理失败");
    }
  }

  /** 更新插件内容 */
  async updateContent(content: string) {
    if (!this.props.id) return this;

    try {
      // 保存内容到后端文件系统
      await cmd.invoke("plugin_save_content", {
        id: this.props.id,
        content: content,
      });

      this.content = content;

      // 处理插件内容
      const pluginInfo = await this.processContent(content);

      // 更新插件信息
      await this.update({
        name: pluginInfo.name,
        description: pluginInfo.description,
        version: pluginInfo.version,
        tools: pluginInfo.tools.map((tool) => ({
          ...tool,
          plugin: this.props.id,
        })),
      });

      return this;
    } catch (error) {
      console.error("Failed to update content:", error);
      throw error;
    }
  }

  /** 删除插件 */
  static async delete(id: string) {
    try {
      // 删除插件存储
      ToolkitStore.delete(id);

      // 删除插件文件
      await cmd.invoke("plugin_delete", { id });

      // 如果是当前插件，重置当前插件ID
      const currentId = CurrentToolkitId.current;
      if (currentId === id) {
        CurrentToolkitId.set("");
      }
    } catch (error) {
      console.error("Failed to delete plugin:", error);
      throw error;
    }
  }

  /** 执行插件
   * 执行一个插件
   */
  async execute(tool: string, args: Record<string, unknown>) {
    try {
      // 获取插件内容（从后端获取最新内容）
      const tsContent = await cmd.invoke<string>("plugin_get_content", {
        id: this.props.id,
      });

      // 替换__DB__表达式
      let processedContent = await this.replaceDBExpressions(tsContent);
      // 替换__IMAGE__表达式
      processedContent = await this.replaceImageExpressions(processedContent);

      // 使用TypeScript编译器将TypeScript代码编译成JavaScript代码
      const jsContent = this.compileTypeScriptToJavaScript(processedContent);

      // 调用后端执行JavaScript代码
      const result = await cmd.invoke("plugin_execute", {
        content: jsContent,
        tool: tool,
        args: args,
      });
      return result;
    } catch (error) {
      console.error(error);
      throw new Error(
        `执行插件时出错:${typeof error === "object" ? JSON.stringify(error) : error}`,
      );
    }
  }

  /** 替换__DB__表达式
   * 替换代码中的__DB__("数据表ID", (item)=>{...})表达式为实际值
   */
  private async replaceDBExpressions(script: string): Promise<string> {
    let result = script;

    // 匹配__DB__调用的起始位置
    const dbCallRegex = /__DB__\(\s*"([^"]+)"\s*,/g;
    let match;

    while ((match = dbCallRegex.exec(script)) !== null) {
      try {
        const tableId = match[1]; // 数据表ID
        const startPos = match.index;
        const commaPos = match.index + match[0].length - 1;

        // 从逗号位置开始查找匹配的右括号，考虑嵌套括号
        let endPos = commaPos + 1;
        let openBrackets = 1; // 已经有一个开括号

        while (endPos < script.length && openBrackets > 0) {
          if (script[endPos] === "(") openBrackets++;
          else if (script[endPos] === ")") openBrackets--;
          endPos++;
        }

        if (openBrackets !== 0) {
          throw new Error(`在位置 ${startPos} 找不到匹配的右括号`);
        }

        // 提取完整的__DB__调用
        const fullMatch = script.substring(startPos, endPos);

        // 提取过滤表达式 - 在逗号后面，右括号前面
        const filterExpr = script.substring(commaPos + 1, endPos - 1).trim();

        // 安全地获取数据表内容
        const tableData = await Echo.get<Record<string, any>>({
          database: "TABLE_DATA",
          name: tableId,
        }).getCurrent();

        let value: Record<string, any>[] = [];

        try {
          // 将tableData转换为数组
          const dataArray = Array.isArray(tableData)
            ? tableData
            : tableData && typeof tableData === "object"
              ? Object.values(tableData)
              : [];

          // 创建并执行过滤函数
          const filterFnBody = `
            try {
              return dataArray.filter(${filterExpr});
            } catch (e) {
              console.error("过滤函数执行出错:", e);
              return dataArray;
            }
          `;

          // 创建并执行过滤函数
          const filterFn = new Function("dataArray", filterFnBody);
          value = filterFn(dataArray);

          // 确保结果是数组
          if (!Array.isArray(value)) {
            value = Array.isArray(dataArray) ? dataArray : [dataArray];
          }
        } catch (e) {
          console.error("构建或执行过滤函数失败:", e);
          // 如果出错，返回原始数据
          value = Array.isArray(tableData)
            ? tableData
            : tableData && typeof tableData === "object"
              ? [tableData]
              : [];
        }

        const serialized = JSON.stringify(value, null, 2);
        result = result.replace(fullMatch, serialized);
      } catch (err) {
        console.error(`处理__DB__表达式失败:`, err);
      }
    }

    return result;
  }

  /** 替换__IMAGE__表达式
   * 替换代码中的__IMAGE__("图片ID")表达式为base64字符串
   */
  private async replaceImageExpressions(script: string): Promise<string> {
    let result = script;
    // 匹配__IMAGE__("id")
    const imageCallRegex = /__IMAGE__\(\s*"([^"]*)"\s*\)/g;
    let match;
    // 由于异步替换，先收集所有匹配
    const matches: { fullMatch: string; id: string }[] = [];
    while ((match = imageCallRegex.exec(script)) !== null) {
      matches.push({ fullMatch: match[0], id: match[1] });
    }
    for (const { fullMatch, id } of matches) {
      try {
        const base64 = await ImageManager.getImageBody(id);
        result = result.replace(fullMatch, `"${base64}"`);
      } catch (err) {
        console.error(`处理__IMAGE__表达式失败:`, err);
        result = result.replace(fullMatch, "");
      }
    }
    return result;
  }

  /** 将TypeScript代码编译成JavaScript代码
   * @param tsContent TypeScript代码
   * @returns 编译后的JavaScript代码
   */
  private compileTypeScriptToJavaScript(tsContent: string): string {
    try {
      // 使用TypeScript编译器编译代码
      const result = ts.transpileModule(tsContent, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
          moduleResolution: ts.ModuleResolutionKind.Node10,
          esModuleInterop: true,
        },
      });

      return result.outputText;
    } catch (error) {
      console.error("编译TypeScript代码时出错:", error);
      throw new Error("TypeScript编译失败");
    }
  }
}
