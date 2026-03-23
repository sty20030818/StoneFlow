import { useTimeoutFn } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'

import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useSettingsStore } from '@/stores/settings'

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

type PersistedUpdateState = Pick<UpdateState, 'available' | 'version' | 'notes' | 'date' | 'error' | 'lastCheckedAt'> & {
	status: 'idle' | 'error'
}

const UPDATE_STATE_CACHE_KEY = 'updater:state'
const UPDATE_AUTO_CHECK_SESSION_KEY = 'updater:auto-check-ran'
const UPDATE_PROMPT_DISMISSED_SESSION_KEY = 'updater:prompt-dismissed'

function createDefaultState(): UpdateState {
	return {
		available: false,
		version: '',
		notes: '',
		date: '',
		progress: 0,
		status: 'idle',
		error: null,
		lastCheckedAt: null,
	}
}

function readCachedState(): UpdateState {
	if (typeof window === 'undefined') return createDefaultState()
	try {
		const raw = window.localStorage.getItem(UPDATE_STATE_CACHE_KEY)
		if (!raw) return createDefaultState()
		const parsed = JSON.parse(raw) as Partial<PersistedUpdateState>
		return {
			available: Boolean(parsed.available),
			version: typeof parsed.version === 'string' ? parsed.version : '',
			notes: typeof parsed.notes === 'string' ? parsed.notes : '',
			date: typeof parsed.date === 'string' ? parsed.date : '',
			progress: 0,
			status: parsed.status === 'error' ? 'error' : 'idle',
			error: typeof parsed.error === 'string' ? parsed.error : null,
			lastCheckedAt: typeof parsed.lastCheckedAt === 'number' && Number.isFinite(parsed.lastCheckedAt) ? parsed.lastCheckedAt : null,
		}
	} catch {
		return createDefaultState()
	}
}

function persistStateSnapshot() {
	if (typeof window === 'undefined') return
	try {
		const payload: PersistedUpdateState = {
			available: state.value.available,
			version: state.value.version,
			notes: state.value.notes,
			date: state.value.date,
			status: state.value.status === 'error' ? 'error' : 'idle',
			error: state.value.error,
			lastCheckedAt: state.value.lastCheckedAt,
		}
		window.localStorage.setItem(UPDATE_STATE_CACHE_KEY, JSON.stringify(payload))
	} catch {
		// 本地缓存失败时忽略，不影响更新主流程。
	}
}

function hasAutoCheckRunInSession() {
	if (typeof window === 'undefined') return false
	try {
		return window.sessionStorage.getItem(UPDATE_AUTO_CHECK_SESSION_KEY) === '1'
	} catch {
		return false
	}
}

function markAutoCheckRunInSession() {
	if (typeof window === 'undefined') return
	try {
		window.sessionStorage.setItem(UPDATE_AUTO_CHECK_SESSION_KEY, '1')
	} catch {
		// 忽略 sessionStorage 异常。
	}
}

function readPromptDismissedInSession() {
	if (typeof window === 'undefined') return false
	try {
		return window.sessionStorage.getItem(UPDATE_PROMPT_DISMISSED_SESSION_KEY) === '1'
	} catch {
		return false
	}
}

function setPromptDismissedInSession(value: boolean) {
	if (typeof window === 'undefined') return
	try {
		if (value) {
			window.sessionStorage.setItem(UPDATE_PROMPT_DISMISSED_SESSION_KEY, '1')
			return
		}
		window.sessionStorage.removeItem(UPDATE_PROMPT_DISMISSED_SESSION_KEY)
	} catch {
		// 忽略 sessionStorage 异常。
	}
}

const state = ref<UpdateState>(readCachedState())
const promptDismissed = ref(readPromptDismissedInSession())

let updateInstance: Update | null = null
let initialized = false
const { start: startAutoCheckTimer, stop: stopAutoCheckTimer } = useTimeoutFn(
	() => {
		void checkForUpdate({ silent: true })
	},
	3000,
	{ immediate: false },
)

function resetUpdatePayload() {
	state.value.available = false
	state.value.version = ''
	state.value.notes = ''
	state.value.date = ''
	state.value.progress = 0
	persistStateSnapshot()
}

function clearAutoCheckTimer() {
	stopAutoCheckTimer()
}

function scheduleAutoCheck() {
	clearAutoCheckTimer()
	if (!useSettingsStore().settings.updaterAutoCheck) return
	if (hasAutoCheckRunInSession()) return
	// 延迟 3 秒检查，避免影响启动性能。
	markAutoCheckRunInSession()
	startAutoCheckTimer()
}

function ensureInitialized() {
	if (initialized) return
	initialized = true
	scheduleAutoCheck()
}

/** 检查更新 */
async function checkForUpdate(options?: { silent?: boolean }) {
	promptDismissed.value = false
	setPromptDismissedInSession(false)
	state.value.status = 'checking'
	state.value.error = null
	state.value.lastCheckedAt = Date.now()
	persistStateSnapshot()

	try {
		updateInstance = await check()

		if (updateInstance) {
			state.value.available = true
			state.value.version = updateInstance.version
			state.value.notes = updateInstance.body ?? ''
			state.value.date = updateInstance.date ?? ''
			state.value.status = 'idle'
			persistStateSnapshot()
			return true
		}

		updateInstance = null
		resetUpdatePayload()
		state.value.status = 'idle'
		persistStateSnapshot()
		if (!options?.silent) {
			console.log('[Updater] 目前已是最新版本')
		}
		return false
	} catch (e) {
		state.value.status = 'error'
		state.value.error = e instanceof Error ? e.message : String(e)
		persistStateSnapshot()
		console.error('[Updater] 检查更新失败:', e)
		return false
	}
}

/** 下载并安装更新 */
async function downloadAndInstall() {
	if (!updateInstance) {
		state.value.error = '没有可用的更新'
		persistStateSnapshot()
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
					persistStateSnapshot()
					break
			}
		})
		return true
	} catch (e) {
		state.value.status = 'error'
		state.value.error = e instanceof Error ? e.message : String(e)
		persistStateSnapshot()
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
	promptDismissed.value = true
	setPromptDismissedInSession(true)
	state.value.error = null
	if (state.value.status !== 'ready') {
		state.value.status = 'idle'
	}
	persistStateSnapshot()
}

function setAutoCheckEnabled(value: boolean) {
	void useSettingsStore().update({ updaterAutoCheck: value })
	if (value) {
		scheduleAutoCheck()
	} else {
		clearAutoCheckTimer()
	}
}

function setPromptInstallEnabled(value: boolean) {
	void useSettingsStore().update({ updaterPromptInstall: value })
}

export function useUpdater() {
	const settingsStore = useSettingsStore()
	const autoCheckEnabled = computed(() => settingsStore.settings.updaterAutoCheck)
	const promptInstallEnabled = computed(() => settingsStore.settings.updaterPromptInstall)
	const shouldPromptInstall = computed(() => {
		return promptInstallEnabled.value && state.value.available && state.value.status !== 'checking' && !promptDismissed.value
	})

	onMounted(() => {
		ensureInitialized()
	})

	return {
		state,
		autoCheckEnabled,
		promptInstallEnabled,
		shouldPromptInstall,
		checkForUpdate,
		downloadAndInstall,
		restartApp,
		dismiss,
		setAutoCheckEnabled,
		setPromptInstallEnabled,
	}
}
