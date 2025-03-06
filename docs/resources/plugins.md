# 插件示例

## HelloGithub

```ts
const getList = async () => {
  const API_KEY = Deno.env.get("HELLO_GITHUB");
  const res = await fetch(
    "https://abroad.hellogithub.com/v1/?sort_by=featured&page=1&rank_by=newest&tid=all",
    {
      headers: {
        accept: "*/*",
        "accept-language":
          "en-CN,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5",
        authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
        "sec-ch-ua":
          '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        Referer: "https://hellogithub.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: null,
      method: "GET",
    },
  );
  const data = res.json();
  return data;
};

export default {
  name: "HelloGithub",
  description: "hello github网站的调用工具",
  tools: {
    getList: {
      description: "获取github的热门列表",
      handler: getList,
    },
  },
};
```

> [!NOTE]
> 注意需要在环境变量中设置 `HELLO_GITHUB` 为 `hellogithub` 的 API Key

## 微博

```ts
const hotest = async () => {
  const res = await fetch("https://weibo.com/ajax/side/hotSearch");
  const data = await res.json();
  return data;
};

export default {
  name: "微博",
  tools: {
    hotest: {
      description: "获取微博热搜",
      handler: hotest,
    },
  },
};
```

## 服务器

```ts
let server: Deno.Server | null = null;
let serverPort: number | null = null;

function handler(_req: Request): Response {
  return new Response("Hello, World!");
}

// 启动服务器
const serve_start = async (port: number) => {
  serverPort = port;
  server = Deno.serve({ port }, handler);
  console.log(`服务器启动成功，监听端口：${port}`);

  // 监听关闭信号
  const signal = Deno.signals.sigint;
  await signal; // 等待 Ctrl+C 或其他中断信号
  await serve_end(port);
};

// 停止服务器
const serve_end = async (port: number) => {
  if (server && serverPort === port) {
    server.close(); // 关闭指定端口的服务器
    server = null;
    serverPort = null;
    console.log(`服务器在端口 ${port} 关闭成功`);
  } else {
    console.log(`没有找到在端口 ${port} 上运行的服务器`);
  }
};

export default {
  name: "测试",
  description: "启动一个服务器",
  tools: {
    serve_start: {
      description: "服务器启动",
      parameters: {
        type: "object",
        properties: {
          port: { type: "number" },
        },
        required: ["port"],
      },
      handler: serve_start,
    },
    serve_end: {
      description: "服务器关闭",
      parameters: {
        type: "object",
        properties: {
          port: { type: "number" },
        },
        required: ["port"],
      },
      handler: serve_end,
    },
  },
};
```

> [!NOTE]
> 注意，插件的调用是在 Command 中调用，因此不存在进程关系。 当 Ghostie 退出后，启动的 server 并不会自动关闭。
