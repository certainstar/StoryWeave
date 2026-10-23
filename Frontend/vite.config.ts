import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: frontendRoot,
  plugins: [vue({
    template: {
      compilerOptions: {
        comments: false,  // 移除 Vue 模板中的注释
      },
    },
  })],
  clearScreen: false,  // 禁用清除屏幕，避免在控制台输出大量日志
  server: {
    port: 1420,  // 本地开发端口
    strictPort: true,  // 严格端口，避免端口被占用
    host: process.env.TAURI_DEV_HOST || false,  // 禁用 host，避免 host 被占用
    watch: {
      ignored: ["**/src-tauri/**"],  // 忽略 src-tauri 目录下的文件，避免监听 rust 构建导致 Vite 重新构建
    },
  },
  envPrefix: ["VITE_", "TAURI_"],  // 环境变量前缀
  build: {
    outDir: "dist",  // 构建输出目录
    emptyOutDir: true,  // 清空输出目录
    target: "es2021",  // 目标浏览器兼容性
    minify: process.env.TAURI_DEBUG ? false : "esbuild",  // 压缩
    sourcemap: !!process.env.TAURI_DEBUG,  // 源映射
  },
});
