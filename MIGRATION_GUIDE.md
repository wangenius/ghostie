# Ghostie 从 Tauri 迁移到 Electron-Vite 指南

## 概述

本指南详细说明了如何将 Ghostie 项目从 Tauri 框架迁移到 Electron-Vite 框架。

## 迁移完成的部分

### 1. 项目结构重组

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
└── package.json       # 更新的依赖
```

### 2. 配置文件更新

#### package.json
- 移除了所有 Tauri 相关依赖
- 添加了 Electron 相关依赖
- 更新了构建脚本

#### electron.vite.config.ts
- 配置了主进程、预加载脚本和渲染进程
- 保持了原有的环境变量和别名配置

#### electron-builder.yml
- 配置了多平台构建
- 设置了应用图标和发布配置

### 3. 核心功能迁移

#### 主进程 (src/main/index.ts)
- 窗口管理
- 托盘图标
- 全局快捷键 (Alt+Space)
- 自动更新
- 主题管理

#### IPC 处理器 (src/main/ipc.ts)
- 文件操作 (打开、保存、读取)
- 窗口操作 (打开配置目录、URL)
- Node.js 插件支持
- 聊天功能
- MCP 服务

#### 预加载脚本 (src/preload/index.ts)
- 安全的 IPC 接口
- 类型安全的通道定义
- 上下文隔离

#### API 适配器 (src/renderer/src/utils/electron-adapter.ts)
- Tauri API 兼容层
- 无缝迁移现有代码
- 保持 API 接口不变

## 需要完成的步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 更新现有代码

在现有的 React 组件中，将 Tauri 导入替换为适配器：

```typescript
// 原来的 Tauri 导入
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/api/dialog';

// 替换为适配器
import { invoke, fs } from '@/utils/electron-adapter';
```

### 3. 测试功能

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 启动应用
npm start
```

## 主要变化

### 1. API 调用方式

**Tauri 方式：**
```typescript
import { invoke } from '@tauri-apps/api/core';
const result = await invoke('read_file', { path: 'file.txt' });
```

**Electron 方式：**
```typescript
import { fs } from '@/utils/electron-adapter';
const result = await fs.readFileText('file.txt');
```

### 2. 文件系统操作

**Tauri 方式：**
```typescript
import { open } from '@tauri-apps/api/dialog';
const selected = await open({
  multiple: true,
  filters: [{
    name: 'Text',
    extensions: ['txt']
  }]
});
```

**Electron 方式：**
```typescript
import { fs } from '@/utils/electron-adapter';
const selected = await fs.openFilesPath();
```

### 3. 窗口管理

**Tauri 方式：**
```typescript
import { appWindow } from '@tauri-apps/api/window';
await appWindow.hide();
```

**Electron 方式：**
```typescript
// 通过 IPC 调用主进程
import { windowApi } from '@/utils/electron-adapter';
await windowApi.notify({ title: '通知', body: '消息' });
```

## 优势

### 1. 更好的生态系统
- Electron 有更丰富的第三方库
- 更多的社区支持和文档
- 更成熟的开发工具

### 2. 更灵活的架构
- 主进程和渲染进程分离
- 更好的安全性控制
- 更细粒度的权限管理

### 3. 更好的性能
- 更快的启动速度
- 更小的包体积
- 更好的内存管理

## 注意事项

### 1. 安全性
- Electron 需要更多的安全配置
- 确保上下文隔离
- 验证 IPC 通道

### 2. 兼容性
- 某些 Tauri 特定功能需要重新实现
- 文件路径处理可能不同
- 平台特定功能需要适配

### 3. 调试
- 使用 Electron DevTools
- 主进程和渲染进程分别调试
- 使用 electron-log 进行日志记录

## 下一步

1. 测试所有现有功能
2. 优化性能和用户体验
3. 添加 Electron 特定功能
4. 完善错误处理和日志
5. 更新文档和示例

## 故障排除

### 常见问题

1. **IPC 调用失败**
   - 检查通道名称是否正确
   - 确保主进程已注册处理器
   - 验证参数类型

2. **文件权限问题**
   - 检查文件路径
   - 确保有适当的权限
   - 使用绝对路径

3. **构建失败**
   - 检查依赖版本
   - 清理 node_modules
   - 重新安装依赖

### 调试技巧

1. 使用 `console.log` 在渲染进程中调试
2. 使用 `electron-log` 在主进程中记录日志
3. 打开 DevTools 查看错误信息
4. 检查 IPC 通信是否正常

## 总结

通过这个迁移，Ghostie 项目将获得更好的性能、更丰富的生态系统和更灵活的架构。虽然需要一些初始工作，但长期来看这将为项目带来更多可能性。 