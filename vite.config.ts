import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { version } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  define: {
    PACKAGE_VERSION: JSON.stringify(version),
    SALT_ROUNDS: 10,
    API_KEY: process.env.API_KEY,
    SUPABASE_URL: JSON.stringify("https://iwuvrfojrkclhcxfcjzy.supabase.co"),
    SUPABASE_ANON_KEY: JSON.stringify(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dXZyZm9qcmtjbGhjeGZjanp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTA0NDIsImV4cCI6MjA1ODk4NjQ0Mn0.L_VhFwjH1wO2KyqdUBruc1O0AH78mP-2mIkdQwTyak8",
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@common": path.resolve(__dirname, "./src/common"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@windows": path.resolve(__dirname, "./src/windows"),
      "@hook": path.resolve(__dirname, "./src/hook"),
      "@workflow": path.resolve(__dirname, "./src/workflow"),
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
