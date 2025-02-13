/**
 * 文本处理工具集
 * 这是一个示例插件，展示如何使用 Deno 编写插件
 */

interface TextAnalysisResult {
  charCount: number;
  wordCount: number;
  lineCount: number;
  uniqueWords: number;
}

/**
 * 分析文本统计信息
 * @param text 要分析的文本
 * @returns 文本统计信息
 */
async function analyzeText({
  text,
  length,
}: {
  text: string;
  length: {
    good: string;
    description: string;
  };
}): Promise<TextAnalysisResult> {
  const lines = text.split("\n");
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);

  console.log(length.good);
  console.log(length.description);
  console.log(text);

  return {
    charCount: text.length,
    wordCount: words.length,
    lineCount: lines.length,
    uniqueWords: uniqueWords.size,
  };
}

/**
 * 文本格式转换
 * @param text 要转换的文本
 * @param format 目标格式 (upper/lower/title)
 * @returns 转换后的文本
 */
async function convertTextCase({
  text,
  format,
}: {
  text: string;
  format: "upper" | "lower" | "title";
}): Promise<string> {
  switch (format) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    default:
      throw new Error("不支持的格式");
  }
}

// 导出插件函数
export default {
  name: "text_plugin",
  description: "文本处理工具集",
  functions: {
    analyze: {
      name: "analyze_text",
      description: "分析文本统计信息",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "要分析的文本内容",
          },
          length: {
            type: "object",
            properties: {
              good: {
                type: "string",
                description: "文本长度类型",
              },
              description: {
                type: "string",
                description: "文本长度描述",
              },
            },
          },
        },
        required: ["text"],
      },
      handler: analyzeText,
    },
    convert: {
      name: "convert_case",
      description: "转换文本大小写格式",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "要转换的文本内容",
          },
          format: {
            type: "string",
            description: "目标格式",
            enum: ["upper", "lower", "title"],
          },
        },
        required: ["text", "format"],
      },
      handler: convertTextCase,
    },
  },
};
