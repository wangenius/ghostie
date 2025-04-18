import { ImageManager } from "@/resources/Image";
import { SkillManager } from "../SkillManager";
import { gen } from "@/utils/generator";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";

/** 将本地图片转换为base64 */
SkillManager.register("imageLoading", {
  name: "图片加载",
  description: "将本地图片连接转换为base64放到数据库中, 并返回图片id",
  params: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "图片绝对路径",
      },
    },
    required: ["path"],
  },
  execute: async (params: Record<string, any>) => {
    const { path } = params;
    const id = gen.id();

    try {
      // 读取文件内容
      const binaryData = await readFile(path);

      // 将二进制数据转换为base64
      const base64String = btoa(
        new Uint8Array(binaryData).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      // 根据文件扩展名确定内容类型
      const fileExt = path.split(".").pop()?.toLowerCase() || "";
      let contentType = "image/png"; // 默认

      // 常见图片格式的MIME类型映射
      const mimeTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        bmp: "image/bmp",
        webp: "image/webp",
        svg: "image/svg+xml",
      };

      if (fileExt in mimeTypes) {
        contentType = mimeTypes[fileExt];
      }

      // 构建完整的Data URL
      const dataUrl = `data:${contentType};base64,${base64String}`;

      // 保存图片到数据库
      await ImageManager.setImage(id, dataUrl, contentType);

      return id;
    } catch (error) {
      console.error("图片加载失败:", error);
      throw new Error(`图片加载失败: ${error}`);
    }
  },
});

SkillManager.register("imageSave", {
  name: "图片保存",
  description: "将图片ID对应的图片保存到本地, 并返回图片路径",
  params: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "图片ID",
      },
      path: {
        type: "string",
        description: "图片绝对路径，不包含扩展名",
      },
    },
    required: ["id", "path"],
  },
  execute: async (params: Record<string, any>) => {
    const { id, path } = params;

    try {
      // 从ImageManager获取图片数据
      const imageData = await ImageManager.getImageBody(id);
      if (!imageData) {
        throw new Error(`未找到ID为${id}的图片`);
      }
      let mimeType = "image/png";
      let fileExtension = "png";
      // 从DataURL中提取MIME类型
      const mimeMatch = imageData.match(/^data:([^;]+);/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
        // 从MIME类型提取扩展名
        const extMap: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/bmp": "bmp",
          "image/webp": "webp",
          "image/svg+xml": "svg",
        };
        fileExtension = extMap[mimeType] || "png";
      }

      // 提取Base64数据并转换为二进制数组
      const base64Data = imageData.replace(/^data:[^;]+;base64,/, "");
      const binaryData = new Uint8Array(
        atob(base64Data)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );

      // 使用writeFile保存二进制数据
      await writeFile(path + "." + fileExtension, binaryData);

      return `图片已成功保存到: ${path}`;
    } catch (error) {
      console.error("图片保存失败:", error);
      throw new Error(`图片保存失败: ${error}`);
    }
  },
});
