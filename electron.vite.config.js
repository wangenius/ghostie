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
            bytecodePlugin({ protectedStrings: ["https://iwuvrfojrkclhcxfcjzy.supabase.co"] })
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
            SUPABASE_URL: JSON.stringify("https://iwuvrfojrkclhcxfcjzy.supabase.co"),
            SUPABASE_ANON_KEY: JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dXZyZm9qcmtjbGhjeGZjanp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTA0NDIsImV4cCI6MjA1ODk4NjQ0Mn0.L_VhFwjH1wO2KyqdUBruc1O0AH78mP-2mIkdQwTyak8"),
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
