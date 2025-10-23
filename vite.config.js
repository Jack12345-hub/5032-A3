// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // 读取 .env* 或 CI 中注入的环境变量
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'   // 默认 Cloudflare 用根路径

  return {
    plugins: [vue()],
    base,                               // ✅ 关键
    build: { outDir: 'dist' }
  }
})