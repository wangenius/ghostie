import { Echo } from "echo-state";

interface ImageProps {
  id: string;
  contentType: string;
  base64Image: string;
  task_id?: string;
}

export const ImagesStore = new Echo<Record<string, ImageProps>>({}).indexed({
  database: "images",
  name: "images",
});

export class ImageManager {
  private static async compressImage(
    base64Image: string,
    contentType: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("无法获取 canvas 上下文"));
          return;
        }

        // 计算新的尺寸，保持宽高比
        let width = img.width;
        let height = img.height;
        const maxSize = 200;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制压缩后的图片
        ctx.drawImage(img as CanvasImageSource, 0, 0, width, height);

        // 转换为 base64，使用更低的质量
        const compressedBase64 = canvas.toDataURL(contentType, 0.5);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error("图片加载失败"));
      };

      img.src = base64Image;
    });
  }

  static async getImageBody(id: string) {
    const images = Echo.get<string>({
      database: "IMAGE_BODY",
      name: id,
    }).getCurrent();
    return images;
  }

  static async setImageTaskId(id: string, task_id: string) {
    ImagesStore.set((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        task_id,
      },
    }));
  }

  static async deleteImage(id: string) {
    ImagesStore.delete(id);
    await Echo.get<string>({
      database: "IMAGE_BODY",
      name: id,
    }).discard();
  }

  static async setImage(
    id: string,
    image: string,
    contentType: string = "image/png",
  ) {
    let finalImage = image;

    try {
      finalImage = await this.compressImage(image, contentType);
    } catch (error) {
      console.error("图片压缩失败:", error);
    }

    ImagesStore.set((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        contentType,
        base64Image: finalImage,
      },
    }));
    new Echo<string>(image)
      .indexed({
        database: "IMAGE_BODY",
        name: id,
      })
      .ready(image);
  }
}
