import { tool } from "@/services/model/Tool";

/** 测试用工具函数 */

export class TestTools {
  @tool("对数字数组进行统计分析，计算平均值、中位数、众数和标准差", {
    numbers: {
      type: "array",
      items: { type: "number" },
      description: "要分析的数字数组",
      required: true,
    },
  })
  static async dataAnalysis(args: { numbers: number[] }): Promise<{
    mean: number;
    median: number;
    mode: number[];
    standardDeviation: number;
  }> {
    const mean = args.numbers.reduce((a, b) => a + b, 0) / args.numbers.length;

    const sortedNumbers = [...args.numbers].sort((a, b) => a - b);
    const median =
      sortedNumbers.length % 2 === 0
        ? (sortedNumbers[sortedNumbers.length / 2 - 1] +
            sortedNumbers[sortedNumbers.length / 2]) /
          2
        : sortedNumbers[Math.floor(sortedNumbers.length / 2)];

    const frequencyMap = new Map();
    args.numbers.forEach((num) =>
      frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1)
    );
    let maxFrequency = 0;
    const mode: number[] = [];
    frequencyMap.forEach((freq, num) => {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        mode.length = 0;
        mode.push(num);
      } else if (freq === maxFrequency) {
        mode.push(num);
      }
    });

    const standardDeviation = Math.sqrt(
      args.numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        args.numbers.length
    );

    return { mean, median, mode, standardDeviation };
  }

  @tool("分析文本，计算单词数、句子数、字符数，并找出最常用的词", {
    text: {
      type: "string",
      description: "要分析的文本",
      required: true,
    },
  })
  static async textAnalysis(args: { text: string }): Promise<{
    wordCount: number;
    sentenceCount: number;
    characterCount: number;
    topWords: Array<{ word: string; count: number }>;
  }> {
    const words = args.text.toLowerCase().match(/\b\w+\b/g) || [];
    const sentences = args.text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const characters = args.text.replace(/\s/g, "").length;

    const wordFrequency = new Map();
    words.forEach((word) =>
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
    );

    const topWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      characterCount: characters,
      topWords,
    };
  }

  @tool("计算两个日期之间的差异，包括天数、周数、月数和年数", {
    date1: {
      type: "string",
      description: "第一个日期 (YYYY-MM-DD格式)",
      required: true,
    },
    date2: {
      type: "string",
      description: "第二个日期 (YYYY-MM-DD格式)",
      required: true,
    },
  })
  static async dateOperations(args: { date1: string; date2: string }): Promise<{
    daysBetween: number;
    weeksBetween: number;
    monthsBetween: number;
    yearsBetween: number;
    isLeapYear: boolean;
    dayOfWeek: string;
  }> {
    const d1 = new Date(args.date1);
    const d2 = new Date(args.date2);

    const daysBetween = Math.abs(
      Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
    );
    const weeksBetween = Math.floor(daysBetween / 7);
    const monthsBetween = Math.abs(
      (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth()
    );
    const yearsBetween = Math.abs(d2.getFullYear() - d1.getFullYear());

    const isLeapYear = (year: number): boolean => {
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    };

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    return {
      daysBetween,
      weeksBetween,
      monthsBetween,
      yearsBetween,
      isLeapYear: isLeapYear(d2.getFullYear()),
      dayOfWeek: days[d2.getDay()],
    };
  }
}
