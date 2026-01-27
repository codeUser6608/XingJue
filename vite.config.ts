import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// GitHub Pages 部署时，如果仓库名不是 username.github.io，需要设置 base 为仓库名
// 例如：仓库名是 XingJue，则 base 应该是 '/XingJue/'
// 可以通过环境变量 VITE_BASE_PATH 来设置，默认为 '/XingJue/'
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/XingJue/',
  plugins: [react(), tailwindcss()],
})
