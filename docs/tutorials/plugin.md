---
title: Plugin Development
order: 3
---

# Plugin Development

## What is a Plugin

Plugins extend the capabilities of AI assistants.

## How to Develop

1. Use TypeScript
2. Use Deno runtime

## Example

```ts
const getCurrentTime = () => {
  return new Date().toString();
};
export default {
  name: "Time Management",
  description: "",
  tools: {
    getCurrentTime: {
      description: "Get current time",
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

Note:

1. You must export the default format using export default.
2. name represents the plugin name, description represents the plugin introduction.
3. tools represents the multiple functions in the plugin.
4. The key and handler of tools must be consistent with the method name, as shown above with getCurrentTime.

```ts
const new_list = async ({ keyword }: { keyword: string }) => {
  // Basic parameter configuration
  const apiUrl = "<http://v.juhe.cn/toutiao/index>";
  // Interface request parameter configuration
  const requestParams = new URLSearchParams({
    key: API_KEY,
    type: keyword,
    page: "1",
    page_size: "10",
    is_filter: "",
  });
  try {
    // Initiate interface network request
    const response = await fetch(
${apiUrl}?${requestParams.toString()}
);

    if (!response.ok) {
      throw new Error(
HTTP error! Status: ${response.status}
);
    }
    // Parse response result
    const responseResult = await response.json();
    return responseResult.result?.data || [];
  } catch (error) {
    console.error("Request exception", error);
    return [];
  }
};
export default {
  name:"Headline News",
  tools:{
    new_list:{
      description:"Get list",
      parameters:{
        type:"object",
        properties:{
          keyword: {
          type: "string",
          description:
        "Keyword, supported types: top(recommended,default), guonei(domestic), guoji(international), yule(entertainment), tiyu(sports), junshi(military), keji(technology), caijing(finance), youxi(games), qiche(cars), jiankang(health)",
          }
        },
        required:[]
      },
        handler:new_list
    }
  }
}
```

# Environment Variables

On the plugin settings page, above the list, you can set environment variables.

Calling in code:

```ts
Deno.env.get("GREETING");
```
