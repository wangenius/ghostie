import { defineConfig } from "vitepress";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface SidebarItem {
  text: string;
  link?: string;
  items?: SidebarItem[];
  collapsed?: boolean;
  order?: number;
}

// 生成工作流侧边栏
function generateWorkflowSidebar(): SidebarItem[] {
  const workflowsDir = path.join(__dirname, "../tutorials");
  const resourcesDir = path.join(__dirname, "../resources");

  function processDirectory(dir: string): SidebarItem[] {
    const items: SidebarItem[] = [];
    const files = fs.readdirSync(dir);

    // 首先处理目录
    files
      .filter((file) => {
        const fullPath = path.join(dir, file);
        return fs.statSync(fullPath).isDirectory();
      })
      .forEach((subdir) => {
        const fullPath = path.join(dir, subdir);
        const subItems = processDirectory(fullPath);
        if (subItems.length > 0) {
          items.push({
            text: subdir,
            collapsed: false,
            items: subItems,
            order: 999, // 目录默认排在最后
          });
        }
      });

    // 然后处理文件
    files
      .filter((file) => file.endsWith(".md"))
      .forEach((file) => {
        const fullPath = path.join(dir, file);
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const { data } = matter(content);

          const relativePath = path.relative(workflowsDir, fullPath);
          const link = `/tutorials/${relativePath.replace(/\.md$/, "")}`;

          items.push({
            text: data.title || file.replace(".md", ""),
            link,
            collapsed: false,
            order: data.order ?? 100, // 如果没有指定order，默认为100
          });
        } catch (error) {
          console.error(`处理文件 ${file} 时出错:`, error);
        }
      });

    // 根据order和文件名排序
    return items.sort((a, b) => {
      // 首先按order排序
      if (a.order !== b.order) {
        return (a.order ?? 100) - (b.order ?? 100);
      }
      // order相同时按文件名排序
      return a.text.localeCompare(b.text);
    });
  }

  const sidebarItems = processDirectory(workflowsDir);
  const resourcesItems = processDirectory(resourcesDir);

  return [
    {
      text: "教程",
      items: sidebarItems,
    },
    {
      text: "资源",
      items: resourcesItems,
    },
  ];
}

export default defineConfig({
  title: "Ghostie",
  description: "Ghostie文档",
  base: process.env.NODE_ENV === "production" ? "/" : "/ghostie/",
  head: [
    ["link", { rel: "icon", type: "image/x-icon", href: "public/icon.ico" }],
  ],
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "教程", link: "/tutorials/start" },
    ],
    // 根据路径使用不同的侧边栏
    sidebar: {
      "/tutorials/": generateWorkflowSidebar(),
      "/resources/": generateWorkflowSidebar(),
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/wangenius/ghostie" },
    ],
  },
});
