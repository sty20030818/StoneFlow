import { useNow } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { useUpdater } from '@/composables/useUpdater'
import { useSettingsSystemActions } from '@/pages/Settings/composables/useSettingsSystemActions'
import { getIdentifier, getName, getVersion } from '@tauri-apps/api/app'
import { appLocalDataDir, executableDir } from '@tauri-apps/api/path'

import { ABOUT_LINKS, CHANGELOG_SUMMARY, CHANGELOG_URL, LICENSE_URL, PRIVACY_URL, RELEASE_PAGE_URL } from '../config'

export function useAboutPage() {
	const toast = useToast()
	const {
		state,
		autoCheckEnabled,
		promptInstallEnabled,
		checkForUpdate,
		downloadAndInstall,
		restartApp,
		setAutoCheckEnabled,
		setPromptInstallEnabled,
	} = useUpdater()
	const { copy, openUrl, openPath } = useSettingsSystemActions()

	const appName = ref('StoneFlow')
	const currentVersion = ref('0.0.0')
	const identifier = ref('')
	const buildNumber = ref(import.meta.env.VITE_BUILD_NUMBER ?? '')
	const installPath = ref('')
	const dataPath = ref('')

	const advancedOpen = ref(false)
	const now = useNow({ interval: 60_000 })

	const aboutLinks = ABOUT_LINKS
	const changelogSummary = CHANGELOG_SUMMARY
	const licenseUrl = LICENSE_URL
	const privacyUrl = PRIVACY_URL

	const lastCheckedText = computed(() => {
		if (!state.value.lastCheckedAt) return '尚未检查'
		// 显式依赖 now，保证相对时间文案自动刷新。
		void now.value
		return formatDistanceToNow(state.value.lastCheckedAt, { addSuffix: true, locale: zhCN })
	})

	const updateStateLabel = computed(() => {
		if (state.value.status === 'checking') return '检查中'
		if (state.value.status === 'downloading') return '下载中'
		if (state.value.status === 'ready') return '等待安装'
		if (state.value.status === 'error') return '检查失败'
		if (state.value.available) return '发现更新'
		return '已是最新版'
	})

	async function handleCheckUpdate() {
		const hasUpdate = await checkForUpdate()
		if (state.value.status === 'error') return
		toast.add({
			title: hasUpdate ? `发现更新 v${state.value.version}` : '当前已是最新版',
			color: hasUpdate ? 'primary' : 'success',
		})
	}

	async function handleDownloadUpdate() {
		const ok = await downloadAndInstall()
		if (ok) {
			toast.add({ title: '更新下载完成', description: '可重启应用完成安装。', color: 'success' })
		}
	}

	async function handleRestart() {
		try {
			await restartApp()
		} catch (error) {
			toast.add({ title: '重启失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
		}
	}

	async function openReleasePage() {
		await openUrl(RELEASE_PAGE_URL)
	}

	async function openChangelog() {
		await openUrl(CHANGELOG_URL)
	}

	async function handleCopyReleaseLink() {
		await copy(RELEASE_PAGE_URL, '下载链接已复制')
	}

	async function openInstallPath() {
		await openPath(installPath.value)
	}

	async function openDataPath() {
		await openPath(dataPath.value)
	}

	async function exportDiagnostic() {
		const payload = {
			time: new Date().toISOString(),
			appName: appName.value,
			version: currentVersion.value,
			build: buildNumber.value || null,
			identifier: identifier.value || null,
			update: {
				status: state.value.status,
				available: state.value.available,
				targetVersion: state.value.version || null,
				lastCheckedAt: state.value.lastCheckedAt,
				error: state.value.error,
			},
			paths: {
				installPath: installPath.value || null,
				dataPath: dataPath.value || null,
			},
		}

		await copy(JSON.stringify(payload, null, 2), '诊断信息已复制')
	}

	function handleAutoCheckChange(event: Event) {
		const target = event.target as HTMLInputElement
		setAutoCheckEnabled(target.checked)
	}

	function handlePromptInstallChange(event: Event) {
		const target = event.target as HTMLInputElement
		setPromptInstallEnabled(target.checked)
	}

	function toggleAdvanced() {
		advancedOpen.value = !advancedOpen.value
	}

	onMounted(async () => {
		try {
			appName.value = await getName()
		} catch {
			// use fallback
		}
		try {
			currentVersion.value = await getVersion()
		} catch {
			// use fallback
		}
		try {
			identifier.value = await getIdentifier()
		} catch {
			// optional
		}
		try {
			installPath.value = await executableDir()
		} catch {
			// optional
		}
		try {
			dataPath.value = await appLocalDataDir()
		} catch {
			// optional
		}
	})

	return {
		state,
		autoCheckEnabled,
		promptInstallEnabled,
		appName,
		currentVersion,
		buildNumber,
		installPath,
		dataPath,
		advancedOpen,
		aboutLinks,
		changelogSummary,
		licenseUrl,
		privacyUrl,
		lastCheckedText,
		updateStateLabel,
		handleCheckUpdate,
		handleDownloadUpdate,
		handleRestart,
		openReleasePage,
		openChangelog,
		handleCopyReleaseLink,
		openInstallPath,
		openDataPath,
		exportDiagnostic,
		handleAutoCheckChange,
		handlePromptInstallChange,
		toggleAdvanced,
		openUrl,
		copy,
	}
}
