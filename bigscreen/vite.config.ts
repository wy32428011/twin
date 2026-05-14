/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-04-29 14:23:38
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-05-05 13:09:32
 * @FilePath: \react-big-screen-master\vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import pkg from "./package.json";
import { analyzer } from "vite-bundle-analyzer";

// 是否分析打包情况
const isAnalyzer = process.env.mode === "analyzer";

export const root = (...args: string[]) => {
  return path.resolve(__dirname, ".", ...args);
};

// https://vitejs.dev/config/
export default defineConfig({
  root: root(),
  base: "/",
  define: {
    VERSION: `"${pkg.version}"`,
    __LIB_MODE__: !!process.env.LIB_MODE,
    __DEV__: process.env.NODE_ENV === "development",
  },
  resolve: {
    alias: {
      "@": root("src"),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        additionalData: `@import "${root("src/global.less")}";`,
      },
    },
  },
  plugins: [
    react(),
    isAnalyzer && analyzer(),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://192.168.60.167:8086",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
});
