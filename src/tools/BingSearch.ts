import { tool } from "@/services/tool/Tool";
import axios from "axios";

interface BingSearchResponse {
  webPages?: {
    value: Array<{
      name: string;
      url: string;
      snippet: string;
    }>;
  };
}

export class BingSearch {
  private static readonly API_ENDPOINT =
    "https://api.bing.microsoft.com/v7.0/search";
  private static readonly API_KEY = process.env.BING_API_KEY;

  @tool("使用必应搜索", {
    query: {
      type: "string",
      description: "搜索关键词",
      required: true,
    },
    count: {
      type: "number",
      description: "返回结果数量",
      required: false,
    },
  })
  static async search(
    query: string,
    count: number = 5
  ): Promise<Array<{ title: string; url: string; snippet: string }>> {
    if (!BingSearch.API_KEY) {
      throw new Error(
        "未配置必应搜索 API 密钥，请在环境变量中设置 BING_API_KEY"
      );
    }

    try {
      const response = await axios.get<BingSearchResponse>(
        BingSearch.API_ENDPOINT,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": BingSearch.API_KEY,
          },
          params: {
            q: query,
            count: count,
            responseFilter: "Webpages",
            mkt: "zh-CN",
          },
        }
      );

      if (!response.data.webPages?.value) {
        return [];
      }

      return response.data.webPages.value.map((result) => ({
        title: result.name,
        url: result.url,
        snippet: result.snippet,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`必应搜索失败: ${error.message}`);
      }
      throw error;
    }
  }
}
