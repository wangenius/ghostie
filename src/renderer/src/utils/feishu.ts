import * as lark from '@larksuiteoapi/node-sdk';

declare const FEISHU_APP_ID: string;
declare const FEISHU_APP_SECRET: string;

// 从环境变量中获取飞书配置
const appId = FEISHU_APP_ID;
const appSecret = FEISHU_APP_SECRET;

if (!appId || !appSecret) {
  throw new Error("飞书配置缺失，请检查环境变量");
}

// 创建飞书客户端
export const feishuClient = new lark.Client({
  appId,
  appSecret,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
  loggerLevel: lark.LoggerLevel.info,
});

// 事件处理器
export const eventDispatcher = new lark.EventDispatcher({
  loggerLevel: lark.LoggerLevel.info,
});

// 工具类
export class FeishuService {
  // 消息发送相关
  static async sendMessage(chatId: string, content: string, msgType: string = 'text') {
    try {
      const res = await feishuClient.im.message.create({
        params: {
          receive_id_type: 'chat_id',
        },
        data: {
          receive_id: chatId,
          content: JSON.stringify({ text: content }),
          msg_type: msgType,
        },
      });
      return res.data;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 通用请求方法
  static async request(method: string, url: string, data?: any, params?: any) {
    try {
      const res = await feishuClient.request({
        method: method as any,
        url,
        data,
        params,
      });
      return res.data;
    } catch (error) {
      console.error('请求失败:', error);
      throw error;
    }
  }

  // 获取用户信息
  static async getUserInfo(userToken: string) {
    try {
      return await this.request('GET', '/authen/v1/user_info', undefined, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  // 创建文档
  static async createDoc(title: string, folderToken?: string) {
    try {
      return await this.request('POST', '/docx/v1/documents', {
        title,
        folder_token: folderToken || '',
      });
    } catch (error) {
      console.error('创建文档失败:', error);
      throw error;
    }
  }

  // 获取文档
  static async getDoc(docToken: string) {
    try {
      return await this.request('GET', `/docx/v1/documents/${docToken}`);
    } catch (error) {
      console.error('获取文档失败:', error);
      throw error;
    }
  }

  // 删除文档
  static async deleteDoc(docToken: string) {
    try {
      return await this.request('DELETE', `/drive/v1/files/${docToken}`, undefined, {
        type: 'docx',
      });
    } catch (error) {
      console.error('删除文档失败:', error);
      throw error;
    }
  }

  // 创建表格
  static async createSheet(title: string, folderToken?: string) {
    try {
      return await this.request('POST', '/sheets/v3/spreadsheets', {
        title,
        folder_token: folderToken || '',
      });
    } catch (error) {
      console.error('创建表格失败:', error);
      throw error;
    }
  }

  // 获取表格数据
  static async getSheetData(sheetToken: string, range: string) {
    try {
      return await this.request('GET', `/sheets/v2/spreadsheets/${sheetToken}/values/${range}`);
    } catch (error) {
      console.error('获取表格数据失败:', error);
      throw error;
    }
  }

  // 更新表格数据
  static async updateSheetData(sheetToken: string, range: string, values: any[][]) {
    try {
      return await this.request('PUT', `/sheets/v2/spreadsheets/${sheetToken}/values`, {
        valueRange: {
          range,
          values,
        },
      });
    } catch (error) {
      console.error('更新表格数据失败:', error);
      throw error;
    }
  }
} 