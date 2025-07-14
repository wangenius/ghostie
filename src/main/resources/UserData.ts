import { app } from "electron";
import fs from "fs";
import path from "path";

export class UserData {
  private static instance: UserData;
  readonly path: string;
  constructor() {
    this.path = app.getPath("userData");
  }

  static getInstance(): UserData {
    if (!UserData.instance) {
      UserData.instance = new UserData();
    }
    return UserData.instance;
  }
  async save(data: object, fileName: string): Promise<void> {
    try {
      // 确保目录存在
      if (!fs.existsSync(this.path)) {
        fs.mkdirSync(this.path, { recursive: true });
        console.log("创建用户数据目录:", this.path);
      }

      const filePath = path.join(this.path, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log("文件保存成功:", filePath);
      console.log("文件大小:", fs.statSync(filePath).size, "字节");
    } catch (error) {
      console.error("保存 Agent 数据失败:", error);
      throw error;
    }
  }
  async load<T = object>(fileName: string): Promise<T> {
    try {
      const filePath = path.join(this.path, fileName);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
      } else {
        return {} as T;
      }
    } catch (error) {
      console.error("加载 Agent 数据失败:", error);
      return {} as T;
    }
  }
}
