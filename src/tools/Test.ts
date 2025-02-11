import { register } from "@services/tool/decorators";

export class TestTool {
  @register("对数字数组进行统计分析，计算平均值、中位数、众数和标准差", {
    numbers: {
      type: "array",
      items: { type: "number" },
      description: "要分析的数字数组",
      required: true,
    },
  })
  static async dataAnalysis(params: { numbers: number[] }): Promise<{
    mean: number;
    median: number;
    mode: number[];
    standardDeviation: number;
  }> {
    const mean =
      params.numbers.reduce((a, b) => a + b, 0) / params.numbers.length;

    const sortedNumbers = [...params.numbers].sort((a, b) => a - b);
    const median =
      sortedNumbers.length % 2 === 0
        ? (sortedNumbers[sortedNumbers.length / 2 - 1] +
            sortedNumbers[sortedNumbers.length / 2]) /
          2
        : sortedNumbers[Math.floor(sortedNumbers.length / 2)];

    const frequencyMap = new Map();
    params.numbers.forEach((num) =>
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
      params.numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        params.numbers.length
    );

    return Promise.resolve({ mean, median, mode, standardDeviation });
  }
}
