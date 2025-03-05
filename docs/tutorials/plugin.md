---
title: 插件开发
order: 3
---

# 插件开发

## 什么是插件

插件扩展了 AI 助手的能力。

## 如何开发

1. 使用 Typescript
2. 使用 deno 运行时

## 示例

```ts
const getCurrentTime = () => {
  return new Date().toString();
};
export default {
  name: "时间管理",
  description: "",
  tools: {
    getCurrentTime: {
      description: "获取当前时间",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: getCurrentTime,
    },
  },
};
```

注意：

1. 必须通过 export default 导出默认格式。
2. name 表示插件名称，description 表示插件简介。
3. tools 表示该插件中的多种功能。
4. tools 的 key 和 handler 必须和方法名一致。如上 getCurrentTime

```ts
const new_list = async ({ keyword }: { keyword: string }) => {
  // 基本参数配置
  const apiUrl = "<http://v.juhe.cn/toutiao/index>";
  // 接口请求入参配置
  const requestParams = new URLSearchParams({
    key: API_KEY,
    type: keyword,
    page: "1",
    page_size: "10",
    is_filter: "",
  });
  try {
    // 发起接口网络请求
    const response = await fetch(
${apiUrl}?${requestParams.toString()}
);

    if (!response.ok) {
      throw new Error(
HTTP error! Status: ${response.status}
);
    }
    // 解析响应结果
    const responseResult = await response.json();
    return responseResult.result?.data || [];
  } catch (error) {
    console.error("请求异常", error);
    return [];
  }
};
export default {
  name:"头条新闻",
  tools:{
    new_list:{
      description:"获取列表",
      parameters:{
        type:"object",
        properties:{
          keyword: {
          type: "string",
          description:
        "关键词, 支持类型: top(推荐,默认), guonei(国内), guoji(国际), yule(娱乐), tiyu(体育), junshi(军事), keji(科技), caijing(财经), youxi(游戏), qiche(汽车), jiankang(健康)",
          }
        },
        required:[]
      },
        handler:new_list
    }
  }
}
```

# 环境变量

在插件设置页面，列表上方，可以设置环境变量。

代码中调用

```ts
Deno.env.get("GREETING");
```
