import { register } from "@/services/tool/decorators";
import axios from "axios";
import { Env } from "@/services/data/env";

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
  @register("使用必应搜索", {
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
  static async search(params: {
    query: string;
    count: number;
  }): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const apiKey = Env.get("BING_API_KEY");
    if (!apiKey) {
      throw new Error(
        "未配置必应搜索 API 密钥，请在环境变量中设置 BING_API_KEY"
      );
    }

    try {
      const response = await axios.get<BingSearchResponse>(
        "https://api.bing.microsoft.com/v7.0/search",
        {
          headers: {
            "Ocp-Apim-Subscription-Key": apiKey,
          },
          params: {
            q: params.query,
            count: params.count,
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
