export default {
  name: "test_plugin",
  description: "测试插件",
  functions: {
    test: {
      name: "test_function",
      description: "测试函数",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "测试输入",
          },
        },
        required: ["text"],
      },
      handler: async (text: string) => text,
    },
  },
};
