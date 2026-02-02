import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const host = process.env.TAURI_DEV_HOST

// 参考：https://vite.dev/config/
export default defineConfig(async () => ({
	plugins: [vue(), ui({ router: false }), tailwindcss()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	build: {
		chunkSizeWarningLimit: 1000, // 把警告阈值提高到 1MB
	},

	// 仅在 `tauri dev` / `tauri build` 下生效的 Vite 配置（为 Tauri 开发体验做优化）
	// 1) 避免 Vite 清屏导致 Rust 错误被覆盖
	clearScreen: false,
	// 2) Tauri 依赖固定端口：端口被占用就直接失败
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			// 3) 忽略 `src-tauri`，避免 watch 抖动
			ignored: ['**/src-tauri/**'],
		},
	},
}))
