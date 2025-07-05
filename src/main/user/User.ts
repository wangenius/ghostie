import { Settings } from "../app/Settings";

/**
 * 用户信息接口
 */
interface UserInfo {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    createdAt: Date;
    lastLoginAt: Date;
}

/**
 * 用户管理类
 * 负责用户信息的存储、读取和管理
 */
export class User {
    /**
     * 用户信息存储键名
     */
    private static readonly USER_KEY = "user_info";

    /**
     * 检查用户登录状态
     * @returns Promise<boolean> 是否已登录
     */
    static async isLoggedIn(): Promise<boolean> {
        try {
            const userInfo = await Settings.get(this.USER_KEY);
            return !!userInfo && !!userInfo.id;
        } catch (error) {
            console.error("检查用户登录状态失败:", error);
            return false;
        }
    }

    /**
     * 获取当前用户信息
     * @returns Promise<UserInfo | null> 用户信息
     */
    static async getCurrentUser(): Promise<UserInfo | null> {
        try {
            const userInfo = await Settings.get(this.USER_KEY);
            return userInfo || null;
        } catch (error) {
            console.error("获取用户信息失败:", error);
            return null;
        }
    }

    /**
     * 保存用户信息
     * @param userInfo 用户信息
     */
    static async saveUser(userInfo: UserInfo): Promise<void> {
        try {
            await Settings.set(this.USER_KEY, userInfo);
        } catch (error) {
            console.error("保存用户信息失败:", error);
            throw error;
        }
    }

    /**
     * 更新用户最后登录时间
     */
    static async updateLastLogin(): Promise<void> {
        try {
            const userInfo = await this.getCurrentUser();
            if (userInfo) {
                userInfo.lastLoginAt = new Date();
                await this.saveUser(userInfo);
            }
        } catch (error) {
            console.error("更新最后登录时间失败:", error);
        }
    }

    /**
     * 清除用户信息
     */
    static async clearUser(): Promise<void> {
        try {
            await Settings.delete(this.USER_KEY);
        } catch (error) {
            console.error("清除用户信息失败:", error);
            throw error;
        }
    }

    /**
     * 用户登录检查
     * 在应用启动时调用，检查用户状态
     */
    static async checkout(): Promise<void> {
        try {
            const isLoggedIn = await this.isLoggedIn();
            if (isLoggedIn) {
                await this.updateLastLogin();
                console.log("用户已登录");
            } else {
                console.log("用户未登录");
            }
        } catch (error) {
            console.error("用户登录检查失败:", error);
        }
    }
} 