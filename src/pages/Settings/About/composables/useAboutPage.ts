import { useNow } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { useI18n } from 'vue-i18n'

import { useUpdater } from '@/composables/useUpdater'
import { useSettingsSystemActions } from '@/pages/Settings/composables/useSettingsSystemActions'
import { getIdentifier, getName, getVersion } from '@tauri-apps/api/app'
import { appLocalDataDir, executableDir } from '@tauri-apps/api/path'
import changelogSource from '../../../../../changelog/changelog.md?raw'

import { ABOUT_LINKS, CHANGELOG_URL, LICENSE_URL, PRIVACY_URL, RELEASE_PAGE_URL } from '../config'

type ChangelogEntry = {
	version: string
	date: string
	items: string
}

function parseChangelogSummary(markdown: string): ChangelogEntry[] {
	const lines = markdown.split('\n')
	const headingPattern = /^##\s+(\d+\.\d+\.\d+)(?:\s*[·|-]\s*([0-9]{4}-[0-9]{2}-[0-9]{2}))?\s*$/
	const entries: ChangelogEntry[] = []
	let current: ChangelogEntry | null = null
	let buffer: string[] = []

	const flush = () => {
		if (!current) return
		const items = buffer.join('\n').trim()
		entries.push({
			...current,
			items,
		})
		buffer = []
	}

	for (const rawLine of lines) {
		const line = rawLine.trimEnd()
		const matched = line.match(headingPattern)
		if (matched) {
			flush()
			current = {
				version: matched[1],
				date: matched[2] || '',
				items: '',
			}
			continue
		}

		if (current) {
			buffer.push(rawLine)
		}
	}

	flush()
	return entries
}

export function useAboutPage() {
	const toast = useToast()
	const { t, locale } = useI18n({ useScope: 'global' })
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
	const parsedChangelogEntries = parseChangelogSummary(changelogSource)

	const aboutLinks = computed(() => {
		return ABOUT_LINKS.map((link) => ({
			id: link.id,
			label: t(link.labelKey),
			value: link.value,
		}))
	})
	const changelogSummary = computed(() => {
		const empty = t('settings.about.changelog.empty')
		return parsedChangelogEntries.map((entry) => ({
			...entry,
			items: entry.items.trim() || empty,
		}))
	})
	const licenseUrl = LICENSE_URL
	const privacyUrl = PRIVACY_URL
	const previewNotesFallback = computed(() => {
		return changelogSummary.value[0]?.items?.trim() || t('settings.about.changelog.empty')
	})

	const lastCheckedText = computed(() => {
		if (!state.value.lastCheckedAt) return t('settings.about.header.lastCheckedNever')
		// 显式依赖 now，保证相对时间文案自动刷新。
		void now.value
		return formatDistanceToNow(state.value.lastCheckedAt, {
			addSuffix: true,
			locale: locale.value.toLowerCase().startsWith('en') ? enUS : zhCN,
		})
	})

	const updateStateLabel = computed(() => {
		if (state.value.status === 'checking') return t('settings.about.updateState.checking')
		if (state.value.status === 'downloading') return t('settings.about.updateState.downloading')
		if (state.value.status === 'ready') return t('settings.about.updateState.ready')
		if (state.value.status === 'error') return t('settings.about.updateState.error')
		if (state.value.available) return t('settings.about.updateState.available')
		return t('settings.about.updateState.latest')
	})

	async function handleCheckUpdate() {
		const hasUpdate = await checkForUpdate()
		if (state.value.status === 'error') return
		toast.add({
			title: hasUpdate
				? t('settings.about.toast.updateFoundTitle', { version: state.value.version })
				: t('settings.about.toast.latestTitle'),
			color: hasUpdate ? 'primary' : 'success',
		})
	}

	async function handleDownloadUpdate() {
		const ok = await downloadAndInstall()
		if (ok) {
			toast.add({
				title: t('settings.about.toast.downloadCompletedTitle'),
				description: t('settings.about.toast.downloadCompletedDescription'),
				color: 'success',
			})
		}
	}

	function handlePreviewUpdateModal() {
		const notes = state.value.notes.trim() || previewNotesFallback.value
		state.value.available = true
		state.value.version = state.value.version || currentVersion.value
		state.value.notes = notes
		state.value.date = new Date().toISOString()
		state.value.progress = 0
		state.value.status = 'idle'
		state.value.error = null
	}

	async function handleRestart() {
		try {
			await restartApp()
		} catch (error) {
			toast.add({
				title: t('settings.about.toast.restartFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
				color: 'error',
			})
		}
	}

	async function openReleasePage() {
		await openUrl(RELEASE_PAGE_URL)
	}

	async function openChangelog() {
		await openUrl(CHANGELOG_URL)
	}

	async function handleCopyReleaseLink() {
		await copy(RELEASE_PAGE_URL, t('settings.about.toast.releaseLinkCopied'))
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

		await copy(JSON.stringify(payload, null, 2), t('settings.about.toast.diagnosticCopied'))
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
		handlePreviewUpdateModal,
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
