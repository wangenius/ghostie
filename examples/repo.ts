// github_trending.ts
const GITHUB_API_URL = "https://api.github.com";
const headers = {
  Authorization: `Bearer xxx`,
};
// 获取仓库详细信息
const getRepoDetail = async (params: { owner: string; repo: string }) => {
  // 获取仓库基本信息
  const repoUrl = `${GITHUB_API_URL}/repos/${params.owner}/${params.repo}`;
  const repoResponse = await fetch(repoUrl, { headers });
  if (!repoResponse.ok) {
    throw new Error(`GitHub API Error: ${repoResponse.statusText}`);
  }
  const repoData = await repoResponse.json();

  // 获取 README 内容
  try {
    const readmeUrl = `${GITHUB_API_URL}/repos/${params.owner}/${params.repo}/readme`;
    const readmeResponse = await fetch(readmeUrl, { headers });
    if (readmeResponse.ok) {
      const readmeData = await readmeResponse.json();
      const readme = Buffer.from(readmeData.content, "base64").toString();
      repoData.readme = readme;
    }
  } catch (error) {
    console.warn("Failed to fetch README:", error);
  }

  return {
    name: repoData.name,
    full_name: repoData.full_name,
    description: repoData.description,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    language: repoData.language,
    url: repoData.html_url,
    created_at: repoData.created_at,
    updated_at: repoData.updated_at,
    homepage: repoData.homepage,
    topics: repoData.topics,
    default_branch: repoData.default_branch,
    open_issues_count: repoData.open_issues_count,
    watchers_count: repoData.watchers_count,
    subscribers_count: repoData.subscribers_count,
    license: repoData.license,
    readme: repoData.readme,
  };
};

// 获取用户信息
const getUserInfo = async (params: { username: string }) => {
  const url = `${GITHUB_API_URL}/users/${params.username}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
};

console.log(await getUserInfo({ username: "wangenius" }));

// 获取用户的仓库列表
const getUserRepos = async (username: string, page = 1, per_page = 30) => {
  const url = `${GITHUB_API_URL}/users/${username}/repos?page=${page}&per_page=${per_page}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
};

// 搜索并返回 trending 仓库
const trending = async ({
  language = "all",
  label = "",
  sort = "stars",
  order = "desc",
  since = "daily",
  page = 1,
  per_page = 30,
}: {
  language?: string;
  label?: string;
  sort?: "stars" | "forks";
  order?: "desc" | "asc";
  since?: "daily" | "weekly" | "monthly";
  page?: number;
  per_page?: number;
}) => {
  // 构建查询字符串
  let query = `stars:>500`;
  if (language !== "all") query += `+language:${language}`;
  if (label) query += `+topic:${label}`;

  // GitHub API URL
  const url = `${GITHUB_API_URL}/search/repositories?q=${encodeURIComponent(
    query
  )}&sort=${sort}&order=${order}&page=${page}&per_page=${per_page}`;

  // 请求 GitHub API
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

export default {
  name: "github_trending",
  description: "获取 GitHub 能力",
  tools: {
    trending: {
      description: "搜索 GitHub 上的 Trending 仓库",
      parameters: {
        type: "object",
        properties: {
          language: {
            type: "string",
            description: "编程语言筛选（如 JavaScript、Python 等）",
          },
          label: {
            type: "string",
            description: "标签筛选（如 'machine-learning'）",
          },
          sort: {
            type: "string",
            enum: ["stars", "forks"],
            description: "排序字段，按 stars 或 forks 排序",
          },
          order: {
            type: "string",
            enum: ["asc", "desc"],
            description: "排序顺序，asc 或 desc",
          },
          since: {
            type: "string",
            enum: ["daily", "weekly", "monthly"],
            description: "Trending 时间周期，daily、weekly 或 monthly",
          },
          page: {
            type: "number",
            description: "页码",
          },
          per_page: {
            type: "number",
            description: "每页显示的结果数量",
          },
        },
        required: [],
      },
      handler: trending,
    },
    getRepoDetail: {
      description: "获取GitHub仓库详细信息",
      parameters: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "仓库所有者",
          },
          repo: {
            type: "string",
            description: "仓库名称",
          },
        },
        required: ["owner", "repo"],
      },
      handler: getRepoDetail,
    },
    getUserInfo: {
      description: "获取GitHub用户信息",
      parameters: {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "GitHub用户名",
          },
        },
        required: ["username"],
      },
      handler: getUserInfo,
    },
    getUserRepos: {
      description: "获取用户的仓库列表",
      parameters: {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "GitHub用户名",
          },
          page: {
            type: "number",
            description: "页码",
          },
          per_page: {
            type: "number",
            description: "每页显示的结果数量",
          },
        },
        required: ["username"],
      },
      handler: getUserRepos,
    },
  },
};
