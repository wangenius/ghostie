import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { Echo } from "echo-state";
export const MCP_DATABASE = "mcp";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

const DEFAULT_MCP: MCPProps = {
  id: "",
  service: "",
  name: "",
  description: "",
  opened: false,
};

export interface MCPProps {
  id: string;
  service: string;
  name: string;
  description: string;
  opened: boolean;
}

export const MCP_Actived = new Echo<Record<string, MCPTool[]>>({});

export const MCPStore = new Echo<Record<string, MCPProps>>({}).indexed({
  database: MCP_DATABASE,
  name: MCP_DATABASE,
});
export class MCP {
  props: MCPProps = DEFAULT_MCP;

  constructor(mcp?: Partial<MCPProps>) {
    this.props = { ...DEFAULT_MCP, ...mcp };
  }

  static {
    MCPStore.getCurrent().then((mcps) => {
      for (const mcp of Object.values(mcps)) {
        if (mcp.opened) {
          const m = new MCP(mcp);
          m.getInfo();
        }
      }
    });
  }

  /**
   * 创建新的MCP服务实例
   * 生成唯一ID并保存到存储中
   */
  static async create() {
    /* 生成ID */
    const id = gen.id();
    /* 创建代理 */
    const mcp = new MCP({ id });
    /* 保存插件 */
    MCPStore.set({
      [id]: mcp.props,
    });
    /* 返回代理 */
    return mcp;
  }

  /**
   * 获取插件
   * 根据ID获取已有的MCP实例
   */
  static async get(id: string): Promise<MCP> {
    /* 获取插件 */
    const mcp = (await MCPStore.getCurrent())[id];
    /* 如果插件不存在 */
    if (!mcp) {
      throw new Error("MCP not found");
    }
    const instance = new MCP(mcp);
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
    MCPStore.set({
      [this.props.id]: this.props,
    });
    return this;
  }

  /**
   * 删除插件
   * 从存储中移除MCP实例并停止服务
   */
  static async delete(id: string) {
    cmd.invoke("stop_service", {
      id,
    });
    /* 删除插件 */
    MCPStore.delete(id);
  }

  /**
   * 调用工具
   * 执行指定MCP服务中的特定工具
   */
  run(tool: string, args: Record<string, unknown>) {
    return cmd.invoke("call_tool", {
      id: this.props.service,
      name: tool,
      args,
    });
  }

  /**
   * 启动服务
   * 初始化并启动MCP服务实例
   */
  async start() {
    await cmd.invoke("start_service", {
      id: this.props.service,
    });
    this.getInfo();
  }

  /**
   * 停止服务
   * 终止MCP服务实例
   */
  async stop() {
    cmd.invoke("stop_service", {
      id: this.props.service,
    });
    this.update({ opened: false });
    MCP_Actived.delete(this.props.id);
  }

  /**
   * 获取工具列表
   * 获取当前MCP服务可用的所有工具
   */
  async getInfo() {
    try {
      const result = await cmd.invoke<[string, MCPTool[]]>("get_service_info", {
        id: this.props.service,
      });
      MCP_Actived.set({
        [this.props.id]: result[1],
      });
      return result;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}
