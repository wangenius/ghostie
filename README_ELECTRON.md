# Ghostie - Electron 版本

基于 Electron-Vite 构建的 AI 助手桌面应用。

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装和运行

1. **克隆项目**
```bash
git clone <repository-url>
cd ghostie
```

2. **快速设置**
```bash
./setup-electron.sh
```

3. **开发模式**
```bash
npm run dev
```

4. **构建应用**
```bash
npm run build
```

5. **启动应用**
```bash
npm start
```

## 📁 项目结构

```
ghostie/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts    # 主进程入口
│   │   ├── app/        # 应用管理
│   │   └── ipc.ts      # IPC 处理器
│   ├── preload/        # 预加载脚本
│   │   └── index.ts    # 预加载脚本入口
│   ├── renderer/       # 渲染进程（前端）
│   │   ├── src/        # React 源代码
│   │   ├── public/     # 静态资源
│   │   └── index.html  # HTML 入口
│   └── common/         # 共享代码
├── resources/          # 应用资源
├── electron.vite.config.ts  # Electron-Vite 配置
├── electron-builder.yml     # 构建配置
└── package.json       # 项目配置
```

## 🛠️ 开发

### 脚本命令

- `npm run dev` - 启动开发模式
- `npm run build` - 构建应用
- `npm run start` - 启动应用
- `npm run clean` - 清理构建文件
- `npm run build:win` - 构建 Windows 版本
- `npm run build:mac` - 构建 macOS 版本
- `npm run build:linux` - 构建 Linux 版本

### 调试

1. **主进程调试**
   - 在 `src/main/index.ts` 中添加 `console.log`
   - 使用 `electron-log` 记录日志

2. **渲染进程调试**
   - 打开 DevTools (Ctrl+Shift+I)
   - 使用浏览器调试工具

3. **IPC 通信调试**
   - 检查 `src/main/ipc.ts` 中的处理器
   - 验证 `src/preload/index.ts` 中的通道定义

## 🔧 配置

### 环境变量

在 `electron.vite.config.ts` 中配置：

```typescript
define: {
  PACKAGE_VERSION: JSON.stringify(version),
  SALT_ROUNDS: 10,
  API_KEY: process.env.API_KEY,
  SUPABASE_URL: JSON.stringify("your-supabase-url"),
  SUPABASE_ANON_KEY: JSON.stringify("your-supabase-key"),
}
```

### 构建配置

在 `electron-builder.yml` 中配置：

```yaml
appId: com.wangenius.ghostie
productName: Ghostie
directories:
  output: out
  buildResources: resources
```

## 📦 构建

### 开发构建

```bash
npm run build
```

### 生产构建

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### 发布

```bash
npm run release:win
```

## 🔒 安全

- 使用上下文隔离
- 验证 IPC 通道
- 限制文件系统访问
- 安全的预加载脚本

## 🐛 故障排除

### 常见问题

1. **依赖安装失败**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **构建失败**
   ```bash
   npm run clean
   npm run build
   ```

3. **应用无法启动**
   - 检查 Node.js 版本
   - 验证依赖完整性
   - 查看错误日志

### 调试技巧

1. **启用详细日志**
   ```typescript
   import log from 'electron-log';
   log.transports.file.level = 'debug';
   ```

2. **检查 IPC 通信**
   ```typescript
   // 在主进程中
   ipcMain.handle('test', () => {
     console.log('IPC 处理器被调用');
     return 'success';
   });
   ```

3. **验证文件路径**
   ```typescript
   import { join } from 'path';
   const configPath = join(__dirname, '../config');
   ```

## 📚 文档

- [迁移指南](./MIGRATION_GUIDE.md) - 从 Tauri 迁移的详细说明
- [API 文档](./docs/api.md) - API 接口文档
- [开发指南](./docs/development.md) - 开发指南

## 🤝 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 🙏 致谢

- [Electron](https://electronjs.org/) - 桌面应用框架
- [Electron-Vite](https://electron-vite.org/) - 构建工具
- [React](https://reactjs.org/) - UI 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架 