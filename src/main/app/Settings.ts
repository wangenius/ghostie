import { app } from "electron";
import fs from "fs/promises";
import path from "path";

/**
 * 设置管理类
 * 负责应用设置的存储、读取和管理（JSON 文件持久化，兼容 jezzlab 风格）
 */
export class Settings {
    /**
     * 设置文件路径
     */
    private static get filePath(): string {
        const dir = path.join(app.getPath("userData"), "ghostie");
        return path.join(dir, "settings.json");
    }

    /**
     * 读取所有设置
     * @returns Promise<Record<string, any>>
     */
    private static async readAll(): Promise<Record<string, any>> {
        try {
            const file = await fs.readFile(this.filePath, "utf-8");
            return JSON.parse(file);
        } catch (e) {
            return {};
        }
    }

    /**
     * 写入所有设置
     * @param data 设置对象
     */
    private static async writeAll(data: Record<string, any>): Promise<void> {
        const dir = path.dirname(this.filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    }

    /**
     * 获取设置值
     * @param key 设置键名
     * @returns Promise<any> 设置值
     */
    static async get(key: string): Promise<any> {
        const all = await this.readAll();
        return all[key];
    }

    /**
     * 设置值
     * @param key 设置键名
     * @param value 设置值
     */
    static async set(key: string, value: any): Promise<void> {
        const all = await this.readAll();
        all[key] = value;
        await this.writeAll(all);
    }

    /**
     * 删除设置
     * @param key 要删除的设置键名
     */
    static async delete(key: string): Promise<void> {
        const all = await this.readAll();
        delete all[key];
        await this.writeAll(all);
    }

    /**
     * 清空所有设置
     */
    static async clear(): Promise<void> {
        await this.writeAll({});
    }
} 