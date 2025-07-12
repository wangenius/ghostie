import { gen } from "@/utils/generator";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

const DEFAULT_MCP: MCPProps = {
  id: "",
  type: "node",
  server: "",
  name: "",
  description: "",
  opened: false,
  env: {},
};

export interface MCPProps {
  id: string;
  type: "node" | "python" | "sse";
  server: string;
  env: Record<string, string>;
  name: string;
  description: string;
  opened: boolean;
  error?: string;
}

/* 当前激活的MCP服务 */
export const MCP_Actived = {};
/* 所有的MCP的服务 */
export const MCPStore = {};
export class MCP {
  props: MCPProps = DEFAULT_MCP;
  constructor(mcp?: Partial<MCPProps>) {
    this.props = { ...DEFAULT_MCP, ...mcp };
  }

  /**
   * 创建新的MCP服务实例
   * 生成唯一ID并保存到存储中
   */
  static async create(props?: Partial<MCPProps>) {
    /* 生成ID */
    const id = gen.id();
    console.log(props);
    console.log({ ...props, id });
    /* 创建代理 */
    const mcp = new MCP({ ...props, id });
    console.log(mcp);

    /* 返回代理 */
    return mcp;
  }

  /**
   * 获取插件
   * 根据ID获取已有的MCP实例
   */
  static async get(id: string): Promise<MCP> {
    const instance = new MCP(MCPStore[id]);
    /* 返回插件 */
    return instance;
  }

  /**
   * 更新插件
   * 更新MCP实例的属性
   */
  async update(data: Partial<Omit<MCPProps, "id">>) {
    if (!this.props.id) {
      return this;
    }
    /* 实例 */
    this.props = { ...this.props, ...data };

    return this;
  }

  /**
   * 删除插件
   * 从存储中移除MCP实例并停止服务
   */
  static async delete(id: string) {}

  /**
   * 调用工具
   * 执行指定MCP服务中的特定工具
   */
  run(tool: string, args: Record<string, unknown>) {}

  /**
   * 启动服务
   * 初始化并启动MCP服务实例
   */
  async start() {
    try {
      this.getInfo();
      this.update({
        opened: true,
      });
    } catch (error) {
      console.error(error);
      this.update({
        opened: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 停止服务
   * 终止MCP服务实例
   */
  async stop() {
    this.update({ opened: false });
  }

  /**
   * 获取工具列表
   * 获取当前MCP服务可用的所有工具
   */
  async getInfo() {
    try {
      MCP_Actived[this.props.id] = [];
      return [];
    } catch (error) {
      console.error(error);
      this.update({
        opened: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
