/** 工具箱*/
export abstract class Tools {
  /** 将时间转换为人性化的格式，如"刚刚"、"5分钟前"、"昨天 14:30"等 */
  static whenWasThat(dateString: number | string | Date): string {
    const now = new Date();
    const date = new Date(dateString);

    // 验证日期是否有效
    if (isNaN(date.getTime())) {
      throw new Error("无效的日期格式");
    }

    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));

    // 处理未来时间
    if (diffInMinutes < 0) {
      return "未来时间";
    }

    if (diffInMinutes <= 0) {
      return "刚刚";
    }
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    }
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formatTime = (date: Date) =>
      `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

    if (date.getTime() >= today.getTime()) {
      return `今天 ${formatTime(date)}`;
    } else if (date.getTime() >= yesterday.getTime()) {
      return `昨天 ${formatTime(date)}`;
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日` + ` ${formatTime(date)}`;
    }
  }

  /** 从文本解析 JSON */
  static JSONFromText = <T>(data: string): T => {
    try {
      return JSON.parse(data) as T;
    } catch (firstError) {
      console.debug("First JSON parse attempt failed:", firstError);

      try {
        const cleanedData = data
          .replace(/```json|```/g, "")
          .replace(/\s+/g, " ")
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          .replace(/,\s*[}\]]/g, "$1")
          .trim();

        return JSON.parse(cleanedData) as T;
      } catch (secondError) {
        console.error("JSON parsing failed after cleaning:", secondError);
        throw new Error("生成格式有问题，本次不消耗墨水，请重新尝试");
      }
    }
  };

  /** 格式化文件大小 */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /** 格式化字数 */
  static formatWordCount(count: number): string {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万字`;
    }
    return `${count}字`;
  }
}
