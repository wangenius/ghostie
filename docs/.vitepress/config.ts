import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Ghostie",
  description: "Ghostie 工作流文档",
  base: "/ghostie/",
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "指南", link: "/workflow" },
    ],
    sidebar: [
      {
        text: "指南",
        items: [
          { text: "工作流基础", link: "/workflow" },
          { text: "工作流开发", link: "/workflow_develop" },
          { text: "工作流分析", link: "/workflow-analysis" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/yourusername/ghostie" },
    ],
  },
});
