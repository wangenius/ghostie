/*
 * @name Product Hunt
 * @description 获取产品信息
 * @author
 * @version 1.0.0
 */

const token = Deno.env.get("PH_TOKEN");

/** 产品信息参数 */
interface ProductInfoParams {
  /** 产品的 slug (URL 标识符) */
  slug: string;
}

/** 获取产品信息 */
export async function getProductInfo(params: ProductInfoParams) {
  const url = `https://api.producthunt.com/v2/api/graphql`;
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (!token) {
    throw new Error("PRODUCT_HUNT_TOKEN 环境变量未设置");
  }

  headers["Authorization"] = `Bearer ${token}`;

  const query = `
    query getProduct($slug: String!) {
      post(slug: $slug) {
        id
        name
        tagline
        description
        url
        votesCount
        website
        thumbnail {
          url
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables: { slug: params.slug },
    }),
  });

  if (!response.ok) {
    throw new Error(`Product Hunt API 错误: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.post;
}

/** 特定分类下的产品列表参数 */
interface TopicPostsParams {
  /** 分类的 slug */
  topic: string;
  /** 返回结果数量（默认20） */
  first?: number;
}

/** 获取特定分类下的产品列表 */
export async function getTopicPosts(params: TopicPostsParams) {
  const url = `https://api.producthunt.com/v2/api/graphql`;
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (!token) {
    throw new Error("token 环境变量未设置");
  }

  headers["Authorization"] = `Bearer ${token}`;

  const query = `
    query getTopicPosts($topic: String!, $first: Int) {
      topic(slug: $topic) {
        name
        posts(first: $first) {
          edges {
            node {
              id
              name
              tagline
              slug
              votesCount
              thumbnail {
                url
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables: {
        topic: params.topic,
        first: params.first || 20,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Product Hunt API 错误: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.stringify(data);
}

/** 热门产品列表参数 */
interface TrendingPostsParams {
  /** 返回结果数量（默认20） */
  first?: number;
}

/** 获取热门产品列表 */
export async function getTrendingPosts(params: TrendingPostsParams) {
  const url = `https://api.producthunt.com/v2/api/graphql`;
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (!token) {
    throw new Error("token 环境变量未设置");
  }

  headers["Authorization"] = `Bearer ${token}`;

  const query = `
    query getTrendingPosts($first: Int) {
      posts(first: $first, order: RANKING) {
        edges {
          node {
            id
            name
            tagline
            slug
            votesCount
            thumbnail {
              url
            }
          }
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables: { first: params.first || 20 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Product Hunt API 错误: ${response.statusText}`);
  }

  const data = await response.json();
  return { result: data.data.posts.edges.map((edge: any) => edge.node) };
}

/** 获取所有产品分类 */
export async function getTopics() {
  const url = `https://api.producthunt.com/v2/api/graphql`;
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (!token) {
    throw new Error("token 环境变量未设置");
  }

  headers["Authorization"] = `Bearer ${token}`;

  const query = `
    query {
      topics(first: 50) {
        edges {
          node {
            id
            name
            slug
            postsCount
          }
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Product Hunt API 错误: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.topics.edges.map((edge: any) => edge.node);
}
