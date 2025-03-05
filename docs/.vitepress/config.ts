import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Ghostie",
  description: "Ghostie文档",
  base: "/ghostie/",
  head: [
    ["link", { rel: "icon", type: "image/x-icon", href: "public/icon.ico" }],
  ],
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
      { icon: "github", link: "https://github.com/wangenius/ghostie" },
    ],
  },
});
