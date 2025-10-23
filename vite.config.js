// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',          // ✅ 改成相对路径
  build: { outDir: 'dist' }
})
