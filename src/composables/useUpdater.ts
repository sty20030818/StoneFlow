import { onMounted, ref } from 'vue'

import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

const AUTO_CHECK_KEY = 'settings_updater_auto_check'
const PROMPT_INSTALL_KEY = 'settings_updater_prompt_install'

const DEFAULT_AUTO_CHECK = true
const DEFAULT_PROMPT_INSTALL = true

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
	/** 最近一次检查时间（毫秒时间戳） */
	lastCheckedAt: number | null
}

const state = ref<UpdateState>({
	available: false,
	version: '',
	notes: '',
	date: '',
	progress: 0,
	status: 'idle',
	error: null,
	lastCheckedAt: null,
})

const autoCheckEnabled = ref(readBool(AUTO_CHECK_KEY, DEFAULT_AUTO_CHECK))
const promptInstallEnabled = ref(readBool(PROMPT_INSTALL_KEY, DEFAULT_PROMPT_INSTALL))

let updateInstance: Update | null = null
let initialized = false
let autoCheckTimer: ReturnType<typeof setTimeout> | null = null

function readBool(key: string, fallback: boolean) {
	try {
		const value = localStorage.getItem(key)
		if (value === null) return fallback
		return value === '1'
	} catch {
		return fallback
	}
}

function writeBool(key: string, value: boolean) {
	try {
		localStorage.setItem(key, value ? '1' : '0')
	} catch {
		// ignore persist failure
	}
}

function resetUpdatePayload() {
	state.value.available = false
	state.value.version = ''
	state.value.notes = ''
	state.value.date = ''
	state.value.progress = 0
}

function clearAutoCheckTimer() {
	if (!autoCheckTimer) return
	clearTimeout(autoCheckTimer)
	autoCheckTimer = null
}

function scheduleAutoCheck() {
	clearAutoCheckTimer()
	if (!autoCheckEnabled.value) return
	// 延迟 3 秒检查，避免影响启动性能
	autoCheckTimer = setTimeout(() => {
		void checkForUpdate({ silent: true })
	}, 3000)
}

function ensureInitialized() {
	if (initialized) return
	initialized = true
	scheduleAutoCheck()
}

/** 检查更新 */
async function checkForUpdate(options?: { silent?: boolean }) {
	state.value.status = 'checking'
	state.value.error = null
	state.value.lastCheckedAt = Date.now()

	try {
		updateInstance = await check()

		if (updateInstance) {
			state.value.available = true
			state.value.version = updateInstance.version
			state.value.notes = updateInstance.body ?? ''
			state.value.date = updateInstance.date ?? ''
			state.value.status = 'idle'
			return true
		}

		updateInstance = null
		resetUpdatePayload()
		state.value.status = 'idle'
		if (!options?.silent) {
			console.log('[Updater] 目前已是最新版本')
		}
		return false
	} catch (e) {
		state.value.status = 'error'
		state.value.error = e instanceof Error ? e.message : String(e)
		console.error('[Updater] 检查更新失败:', e)
		return false
	}
}

/** 下载并安装更新 */
async function downloadAndInstall() {
	if (!updateInstance) {
		state.value.error = '没有可用的更新'
		return false
	}

	state.value.status = 'downloading'
	state.value.progress = 0
	state.value.error = null

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
		return true
	} catch (e) {
		state.value.status = 'error'
		state.value.error = e instanceof Error ? e.message : String(e)
		console.error('[Updater] 下载更新失败:', e)
		return false
	}
}

/** 重启应用 */
async function restartApp() {
	await relaunch()
}

/** 关闭更新提示 */
function dismiss() {
	resetUpdatePayload()
	state.value.status = 'idle'
	state.value.error = null
}

function setAutoCheckEnabled(value: boolean) {
	autoCheckEnabled.value = value
	writeBool(AUTO_CHECK_KEY, value)
	if (value) {
		scheduleAutoCheck()
	} else {
		clearAutoCheckTimer()
	}
}

function setPromptInstallEnabled(value: boolean) {
	promptInstallEnabled.value = value
	writeBool(PROMPT_INSTALL_KEY, value)
}

export function useUpdater() {
	onMounted(() => {
		ensureInitialized()
	})

	return {
		state,
		autoCheckEnabled,
		promptInstallEnabled,
		checkForUpdate,
		downloadAndInstall,
		restartApp,
		dismiss,
		setAutoCheckEnabled,
		setPromptInstallEnabled,
	}
}
