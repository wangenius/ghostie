import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Ghostie",
  description: "Ghostie Documentation",
  base: process.env.NODE_ENV === "production" ? "/" : "/ghostie/",
  head: [["link", { rel: "icon", href: "./icon.png" }]],
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Tutorials", link: "/start/intro" },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/wangenius/ghostie" },
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Introduction", link: "/start/intro" },
          { text: "Installation", link: "/start/install" },
          { text: "FAQ", link: "/start/FAQ" },
        ],
      },
      {
        text: "Guide",
        items: [
          { text: "Settings", link: "/guide/settings" },
          { text: "Agent", link: "/guide/agent" },
          { text: "Model", link: "/guide/model" },
          { text: "Plugin", link: "/guide/plugin" },
          { text: "MCP", link: "/guide/mcp" },
          { text: "Workflow", link: "/guide/workflow" },
          { text: "Knowledge", link: "/guide/knowledge" },
        ],
      },
      {
        text: "Development",
        items: [
          { text: "Plugin Development", link: "/dev/plugin" },
          { text: "Workflow Development", link: "/dev/workflow" },
          { text: "Agent Mode", link: "/dev/agent-mode" },
        ],
      },
      {
        text: "Community",
        items: [
          { text: "Account", link: "/community/account" },
          { text: "Community", link: "/community/community" },
        ],
      },
    ],
  },
});
