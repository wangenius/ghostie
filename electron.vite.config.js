import react from "@vitejs/plugin-react";
import { bytecodePlugin, defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";
import { version } from "./package.json";
export default defineConfig({
    main: {
        build: {
            outDir: "dist/main"
        },
        plugins: [
            externalizeDepsPlugin(),
            bytecodePlugin({ protectedStrings: ["feishu_app_secret"] })
        ],
        resolve: {
            alias: {
                "@common": resolve("src/common")
            }
        }
    },
    preload: {
        build: {
            outDir: "dist/preload"
        },
        plugins: [externalizeDepsPlugin(), bytecodePlugin()]
    },
    renderer: {
        publicDir: resolve("src/renderer/public"),
        build: {
            outDir: "dist/renderer",
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "src/renderer/index.html")
                }
            }
        },
        define: {
            PACKAGE_VERSION: JSON.stringify(version),
            SALT_ROUNDS: 10,
            API_KEY: process.env.API_KEY,
            FEISHU_APP_ID: JSON.stringify(process.env.FEISHU_APP_ID || "cli_a123456789abcdef"),
            FEISHU_APP_SECRET: JSON.stringify(process.env.FEISHU_APP_SECRET || "your_feishu_app_secret"),
        },
        resolve: {
            alias: {
                "@renderer": resolve("src/renderer/src"),
                "@main": resolve("src/renderer/main"),
                "@": resolve("src/renderer/src"),
                "@common": resolve("src/common"),
                "@components": resolve("src/renderer/src/components"),
                "@utils": resolve("src/renderer/src/utils"),
                "@workflow": resolve("src/renderer/src/workflow"),
            }
        },
        plugins: [react()],
        server: {
            port: 1420,
            strictPort: true,
        }
    }
});
