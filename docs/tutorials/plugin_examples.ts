/**
 * @name TavilySearch
 * @description 使用TavilySearch工具联网搜索
 */

/** 搜索参数 */
interface SearchArgs {
  // 搜索内容
  query: string;
  // 最大结果数量
  maxResults: number;
  // 搜索时间范围
  timeRange: "day" | "week" | "month" | "year";
  // 搜索主题
  topic: string;
  // 每个来源返回的文本块数量
  chunksPerSource: number;
  // 是否包含AI生成的答案
  includeAnswer: boolean;
  // 是否包含原始内容
  includeRawContent: boolean;
  // 是否包含图片
  includeImages: boolean;
  // 是否包含图片描述
  includeImageDescriptions: boolean;
  // 包含的域名列表
  includeDomains: string[];
  // 排除的域名列表
  excludeDomains: string[];
  // 搜索最近几天的内容
  days: number;
}

// 直接搜索
const search = async (args: SearchArgs) => {
  try {
    const {
      query,
      maxResults,
      timeRange,
      topic,
      chunksPerSource,
      includeAnswer,
      includeRawContent,
      includeImages,
      includeImageDescriptions,
      includeDomains,
      excludeDomains,
      days,
    } = args;
    const TAVILY_API_KEY = "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";
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: "basic",
        topic,
        chunks_per_source: chunksPerSource,
        time_range: timeRange,
        days,
        include_answer: includeAnswer,
        include_raw_content: includeRawContent,
        include_images: includeImages,
        include_image_descriptions: includeImageDescriptions,
        include_domains: includeDomains,
        exclude_domains: excludeDomains,
      }),
    });

    if (!response.ok) {
      console.error(response);
    }

    return await response.json();
  } catch (error) {
    console.error("搜索失败:", error);
  }
};
