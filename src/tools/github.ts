import { tool } from "@/services/model/Tool";
import axios from "axios";

interface GitHubTrendingRepo {
  author: string;
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  starsToday: number;
}

interface GitHubAPIRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
  } | null;
}

interface GitHubResponse {
  items: GitHubAPIRepo[];
}

export class GitHub {
  private static readonly API_ENDPOINT =
    "https://api.github.com/search/repositories";
  private static readonly API_TOKEN = process.env.GITHUB_API_TOKEN;

  @tool("获取 GitHub Trending 仓库", {
    language: {
      type: "string",
      description: "编程语言筛选",
      required: false,
    },
    since: {
      type: "string",
      description: "时间范围：daily, weekly, monthly",
      required: false,
    },
    limit: {
      type: "number",
      description: "返回仓库数量",
      required: false,
    },
  })
  static async getTrendingRepos({
    language,
    since,
    limit,
  }: {
    language?: string;
    since?: string;
    limit?: number;
  }): Promise<GitHubTrendingRepo[]> {
    if (!GitHub.API_TOKEN) {
      throw new Error(
        "未配置 GitHub API Token，请在环境变量中设置 GITHUB_API_TOKEN"
      );
    }

    try {
      // 计算时间范围
      const date = new Date();
      switch (since) {
        case "weekly":
          date.setDate(date.getDate() - 7);
          break;
        case "monthly":
          date.setMonth(date.getMonth() - 1);
          break;
        default: // daily
          date.setDate(date.getDate() - 1);
      }

      // 构建查询参数
      const query = [
        `created:>${date.toISOString().split("T")[0]}`,
        language ? `language:${language}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const response = await axios.get<GitHubResponse>(GitHub.API_ENDPOINT, {
        params: {
          q: query,
          sort: "stars",
          order: "desc",
          per_page: limit,
        },
        headers: {
          Authorization: `token ${GitHub.API_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      return response.data.items.map((repo) => ({
        author: repo.owner?.login || "unknown",
        name: repo.name,
        description: repo.description || "",
        url: repo.html_url,
        language: repo.language || "unknown",
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        starsToday: repo.stargazers_count, // GitHub API 不直接提供今日 star 数
      }));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`获取 GitHub Trending 失败: ${error.message}`);
      }
      throw error;
    }
  }
}
