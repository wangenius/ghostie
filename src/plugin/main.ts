const EXAMPLE_PLUGIN = `/**
 * @name 测试插件
 * @description 测试插件是用来xxxxxx
 * @version 1.0.0
 * @author Ghostie
 */


// 获取当前日期和时间信息.
export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

// 定义 generateRandom 的参数接口
interface GenerateRandomArgs {
  // 生成类型: 'number'(数字) 或 'string'(字符串). Defaults to 'number'.
  type?: "number" | "string";
  // 随机数最小值 (仅当 type='number'). Defaults to 0.
  min?: number;
  // 随机数最大值 (仅当 type='number'). Defaults to 100.
  max?: number;
  // 随机字符串长度 (仅当 type='string'). Defaults to 10.
  length?: number;
}

// 生成随机数或随机字符串.
export function generateRandom(args: GenerateRandomArgs): number | string {
  const { type = "number", min = 0, max = 100, length = 10 } = args ?? {};
  if (type === "number") {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  } else {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }
}

// 定义 formatText 的参数接口
interface FormatTextArgs {
  /** 要格式化的文本. Required. */
  text: string;
  /** 格式化类型: 'uppercase'(大写), 'lowercase'(小写), 或 'capitalize'(首字母大写). Defaults to 'lowercase'. */
  format?: "uppercase" | "lowercase" | "capitalize";
}

/**
 * @description 格式化文本.
 * @param {FormatTextArgs} args - 参数对象. Required.
 */
export function formatText(args: FormatTextArgs): string {
    // 从接口中解构参数
    const { text, format = "lowercase" } = args;
    switch (format) {
        case "uppercase":
            return text.toUpperCase();
        case "lowercase":
            return text.toLowerCase();
        case "capitalize":
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        default:
            return text;
    }
}
`;
