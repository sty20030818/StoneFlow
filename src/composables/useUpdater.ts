import { ref, onMounted } from 'vue'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type UpdateState = {
	/** 是否有可用更新 */
	available: boolean
	/** 新版本号 */
	version: string
	/** 更新日志 */
	notes: string
	/** 发布日期 */
	date: string
	/** 下载进度 (0-100) */
	progress: number
	/** 当前状态 */
	status: 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
	/** 错误信息 */
	error: string | null
}

export function useUpdater() {
	const state = ref<UpdateState>({
		available: false,
		version: '',
		notes: '',
		date: '',
		progress: 0,
		status: 'idle',
		error: null,
	})

	let updateInstance: Update | null = null

	/** 检查更新 */
	async function checkForUpdate() {
		state.value.status = 'checking'
		state.value.error = null

		try {
			updateInstance = await check()

			if (updateInstance) {
				state.value.available = true
				state.value.version = updateInstance.version
				state.value.notes = updateInstance.body ?? ''
				state.value.date = updateInstance.date ?? ''
				state.value.status = 'idle'
			} else {
				state.value.available = false
				state.value.status = 'idle'
				console.log('[Updater] 目前已是最新版本')
			}
		} catch (e) {
			state.value.status = 'error'
			state.value.error = e instanceof Error ? e.message : String(e)
			console.error('[Updater] 检查更新失败:', e)
		}
	}

	/** 下载并安装更新 */
	async function downloadAndInstall() {
		if (!updateInstance) {
			state.value.error = '没有可用的更新'
			return
		}

		state.value.status = 'downloading'
		state.value.progress = 0

		try {
			let contentLength = 0
			let downloaded = 0

			await updateInstance.downloadAndInstall((event) => {
				switch (event.event) {
					case 'Started':
						contentLength = event.data.contentLength ?? 0
						break
					case 'Progress':
						downloaded += event.data.chunkLength
						if (contentLength > 0) {
							state.value.progress = Math.round((downloaded / contentLength) * 100)
						}
						break
					case 'Finished':
						state.value.progress = 100
						state.value.status = 'ready'
						break
				}
			})
		} catch (e) {
			state.value.status = 'error'
			state.value.error = e instanceof Error ? e.message : String(e)
			console.error('[Updater] 下载更新失败:', e)
		}
	}

	/** 重启应用 */
	async function restartApp() {
		await relaunch()
	}

	/** 关闭更新提示 */
	function dismiss() {
		state.value.available = false
		state.value.status = 'idle'
	}

	// 启动时自动检查更新
	onMounted(() => {
		// 延迟 3 秒检查，避免影响启动性能
		setTimeout(checkForUpdate, 3000)
	})

	return {
		state,
		checkForUpdate,
		downloadAndInstall,
		restartApp,
		dismiss,
	}
}
