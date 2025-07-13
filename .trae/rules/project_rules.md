1. 项目使用的是electron-vite架构。 前后端通信使用 @shell 模块 的 cmd.invoke .
2. 前端在 renderer中，后端在main中。 common中是共用的types。
3. echo是前端的hook，不应该在后端使用。
4. 业务逻辑层在后端。
5. 前端使用 shadcn的组件。
6. ghostie目录下是原本旧的方案（不需要再维护），使用tauri完成的。 在前端的UI和交互上，你应该参考。
7. 前端在获取后端数据时，封装hook。
8. 倒入路径使用 alias 就好了。不要用相对路径，不太好用。基于tsconfig的，web和node都不一样。