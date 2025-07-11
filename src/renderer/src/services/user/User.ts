import { Echoi } from "@/lib/echo/Echo";
import { cmd } from "@/utils/shell";
import { FeishuService } from "@/utils/feishu";

interface FeishuUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  mobile?: string;
  department_ids?: string[];
}

export class UserMananger {
  static store = new Echoi<FeishuUser | null>(null);
  static use = this.store.use.bind(this.store);
  static tokenStore = new Echoi<string | null>(null);

  static async init() {
    // 从本地存储中获取用户token
    const token = localStorage.getItem('feishu_user_token');
    if (token) {
      this.tokenStore.set(token);
      try {
        const userInfo = await FeishuService.getUserInfo(token);
        if (userInfo) {
          this.store.set(userInfo);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        // 清除无效token
        localStorage.removeItem('feishu_user_token');
        this.tokenStore.set(null);
      }
    }
  }

  static async login(userToken: string) {
    try {
      const userInfo = await FeishuService.getUserInfo(userToken);
      if (userInfo) {
        this.store.set(userInfo);
        this.tokenStore.set(userToken);
        localStorage.setItem('feishu_user_token', userToken);
        cmd.message("登录成功", "success");
      }
    } catch (error) {
      console.error("登录失败:", error);
      cmd.message(
        `登录失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  }

  static async logout() {
    try {
      this.store.set(null);
      this.tokenStore.set(null);
      localStorage.removeItem('feishu_user_token');
      cmd.message("登出成功", "success");
    } catch (error) {
      console.error("登出失败:", error);
      cmd.message(
        `登出失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  }

  // 飞书OAuth登录
  static async loginWithFeishu() {
    try {
      // 这里需要实现飞书OAuth流程
      // 1. 跳转到飞书授权页面
      // 2. 获取授权码
      // 3. 用授权码换取access_token
      // 4. 用access_token获取用户信息
      
      // 示例：打开飞书授权链接
      const authUrl = this.getFeishuAuthUrl();
      window.open(authUrl, '_blank');
      
      cmd.message("请在新窗口中完成飞书授权", "info");
    } catch (error) {
      console.error("飞书授权失败:", error);
      cmd.message(
        `飞书授权失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  }

  private static getFeishuAuthUrl(): string {
    // 构建飞书OAuth授权URL
    const baseUrl = 'https://open.feishu.cn/open-apis/authen/v1/authorize';
    const params = new URLSearchParams({
      app_id: 'your_app_id', // 需要替换为实际的App ID
      redirect_uri: 'your_redirect_uri', // 需要替换为实际的回调地址
      scope: 'user:read',
      state: 'random_state_string',
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  // 处理飞书OAuth回调
  static async handleFeishuCallback(code: string, state: string) {
    try {
      // 用授权码换取access_token
      const tokenResponse = await fetch('/api/feishu/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      });
      
      const tokenData = await tokenResponse.json();
      if (tokenData.access_token) {
        await this.login(tokenData.access_token);
      }
    } catch (error) {
      console.error("处理飞书回调失败:", error);
      cmd.message(
        `处理飞书回调失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  }
}
