import { useNow } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { useRemoteSyncActions } from '@/composables/useRemoteSyncActions'
import { validateWithZod } from '@/composables/base/zod'
import { postgresUrlSchema, remoteImportListSchema, remoteProfileSchema } from '@/composables/domain/validation/forms'
import { tauriInvoke } from '@/services/tauri/invoke'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import type {
	RemoteDbProfile,
	RemoteDbProfileInput,
	RemoteSyncDirection,
	RemoteSyncHistoryItem,
} from '@/types/shared/remote-sync'
import {
	type RemoteSyncTableViewItem,
	summarizeRemoteSyncReport,
	toRemoteSyncTableViewItems,
} from '@/utils/remote-sync-report'

type RemoteSyncHistoryFilter = 'all' | RemoteSyncDirection

type RemoteSyncHistoryViewItem = {
	id: string
	direction: RemoteSyncDirection
	directionText: string
	profileName: string
	syncedAtText: string
	summary: string
	tables: RemoteSyncTableViewItem[]
}

export function useRemoteSyncPage() {
	const remoteSyncStore = useRemoteSyncStore()
	const refreshSignals = useRefreshSignalsStore()
	const toast = useToast()
	// const logPrefix = '[settings-remote-sync]'
	const now = useNow({ interval: 60_000 })

	const {
		isPushing,
		isPulling,
		syncError,
		lastPushedAt,
		lastPulledAt,
		syncHistory,
		lastPushReport,
		lastPullReport,
		hasActiveProfile,
		pushToRemote,
		pullFromRemote,
	} = useRemoteSyncActions()

	function log(...args: unknown[]) {
		// console.log(logPrefix, ...args)
		void args
	}

	function logError(...args: unknown[]) {
		// console.error(logPrefix, ...args)
		void args
	}

	const createOpen = ref(false)
	const importOpen = ref(false)
	const editProfileId = ref<string | null>(null)
	const editOpen = computed({
		get: () => !!editProfileId.value,
		set: (val) => {
			if (!val) editProfileId.value = null
		},
	})

	const newName = ref('')
	const newUrl = ref('')
	const editName = ref('')
	const editUrl = ref('')

	const importText = ref('')
	const importError = ref('')

	const testingCurrent = ref(false)
	const testingNew = ref(false)
	const testingEdit = ref(false)
	const savingNew = ref(false)
	const savingEdit = ref(false)
	const importing = ref(false)
	const isClearingHistory = ref(false)
	const historyFilter = ref<RemoteSyncHistoryFilter>('all')
	const historyFilterOptions = [
		{ label: '全部', value: 'all' as const },
		{ label: '仅上传', value: 'push' as const },
		{ label: '仅下载', value: 'pull' as const },
	]

	const deleting = ref(false)
	const deleteTarget = ref<RemoteDbProfile | null>(null)

	const profiles = computed(() => remoteSyncStore.profiles)
	const activeProfileId = computed(() => remoteSyncStore.activeProfileId)
	const activeProfile = computed(() => remoteSyncStore.activeProfile)

	const status = ref<'missing' | 'ok' | 'error' | 'testing'>('missing')
	const statusMessage = computed(() => {
		switch (status.value) {
			case 'ok':
				return '连接可用，已准备同步。'
			case 'error':
				return '连接不可用，请检查数据库地址或网络。'
			case 'testing':
				return '正在测试连接…'
			default:
				return '尚未配置数据库，请先新增或选择一个配置。'
		}
	})

	const statusLabel = computed(() => {
		switch (status.value) {
			case 'ok':
				return '可用'
			case 'error':
				return '错误'
			case 'testing':
				return '测试中'
			default:
				return '未配置'
		}
	})

	const statusBadgeVariant = computed(() => (status.value === 'ok' ? 'soft' : 'outline'))
	const statusBadgeClass = computed(() => {
		switch (status.value) {
			case 'ok':
				return 'bg-primary/10 text-primary'
			case 'error':
				return 'bg-error/10 text-error'
			case 'testing':
				return 'bg-amber-500/10 text-amber-600'
			default:
				return 'bg-elevated text-muted'
		}
	})

	const canSaveNew = computed(() => validateWithZod(remoteProfileSchema, { name: newName.value, url: newUrl.value }).ok)
	const canTestNew = computed(() => validateWithZod(postgresUrlSchema, newUrl.value).ok)
	const canSaveEdit = computed(
		() => validateWithZod(remoteProfileSchema, { name: editName.value, url: editUrl.value }).ok,
	)
	const canTestEdit = computed(() => validateWithZod(postgresUrlSchema, editUrl.value).ok)
	const canImport = computed(() => importText.value.trim().length > 0)

	const deleteOpen = computed({
		get: () => !!deleteTarget.value,
		set: (val) => {
			if (!val) deleteTarget.value = null
		},
	})

	const lastPushedText = computed(() => {
		return formatRelativeTime(lastPushedAt.value, '未上传')
	})

	const lastPulledText = computed(() => {
		return formatRelativeTime(lastPulledAt.value, '未下载')
	})

	const lastPushSummaryText = computed(() => summarizeRemoteSyncReport(lastPushReport.value, '暂无上传统计'))
	const lastPullSummaryText = computed(() => summarizeRemoteSyncReport(lastPullReport.value, '暂无下载统计'))
	const filteredSyncHistory = computed(() => {
		if (historyFilter.value === 'all') return syncHistory.value
		return syncHistory.value.filter((item) => item.direction === historyFilter.value)
	})
	const recentSyncHistory = computed<RemoteSyncHistoryViewItem[]>(() =>
		filteredSyncHistory.value.slice(0, 6).map((item) => toHistoryViewItem(item)),
	)

	function formatRelativeTime(timestamp: number, fallback: string) {
		if (!Number.isFinite(timestamp) || timestamp <= 0) return fallback
		const date = new Date(timestamp)
		if (!Number.isFinite(date.getTime())) return fallback
		void now.value
		try {
			return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
		} catch {
			return fallback
		}
	}

	function formatProfileMeta(profile: RemoteDbProfile) {
		const source = profile.source === 'import' ? '导入' : '手动'
		return `${source} · ${new Date(profile.updatedAt).toLocaleString()}`
	}

	function toHistoryViewItem(item: RemoteSyncHistoryItem): RemoteSyncHistoryViewItem {
		return {
			id: item.id,
			direction: item.direction,
			directionText: item.direction === 'push' ? '上传' : '下载',
			profileName: item.profileName || '未命名配置',
			syncedAtText: new Date(item.syncedAt).toLocaleString(),
			summary: summarizeRemoteSyncReport(item.report, '无统计数据'),
			tables: toRemoteSyncTableViewItems(item.report),
		}
	}

	function setHistoryFilter(filter: RemoteSyncHistoryFilter) {
		historyFilter.value = filter
	}

	async function handleClearSyncHistory() {
		if (syncHistory.value.length === 0 || isClearingHistory.value) return
		try {
			isClearingHistory.value = true
			const direction = historyFilter.value === 'all' ? undefined : historyFilter.value
			await remoteSyncStore.clearSyncHistory(direction)
			toast.add({
				title: '已清空同步记录',
				description: direction ? `已清空${direction === 'push' ? '上传' : '下载'}记录` : '已清空全部记录',
				color: 'success',
			})
		} catch (error) {
			toast.add({
				title: '清空失败',
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
			logError('sync:history:clear:error', error)
		} finally {
			isClearingHistory.value = false
		}
	}

	function openCreate() {
		log('open:create')
		createOpen.value = true
	}

	function openImport() {
		log('open:import')
		importOpen.value = true
	}

	async function openEdit(profile: RemoteDbProfile) {
		log('open:edit', { id: profile.id })
		editProfileId.value = profile.id
		editName.value = profile.name
		try {
			editUrl.value = (await remoteSyncStore.getProfileUrl(profile.id)) ?? ''
			log('open:edit:done', { id: profile.id, hasUrl: !!editUrl.value })
		} catch (error) {
			editUrl.value = ''
			toast.add({
				title: '读取配置失败',
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
			logError('open:edit:error', error)
		}
	}

	async function handleTestCurrent() {
		if (!activeProfileId.value) return
		try {
			log('test:current:start', { profileId: activeProfileId.value })
			testingCurrent.value = true
			status.value = 'testing'
			const url = await remoteSyncStore.getActiveProfileUrl()
			if (!url) throw new Error('未找到数据库地址')
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: url } })
			status.value = 'ok'
			toast.add({ title: '连接成功', description: '数据库连接正常。', color: 'success' })
			log('test:current:done')
		} catch (error) {
			status.value = 'error'
			toast.add({ title: '连接失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('test:current:error', error)
		} finally {
			testingCurrent.value = false
		}
	}

	async function handlePush() {
		if (testingCurrent.value || testingNew.value || testingEdit.value) {
			toast.add({ title: '请等待连接测试完成后再上传', color: 'neutral' })
			return
		}
		if (status.value === 'missing') {
			toast.add({ title: '请先配置并测试连接', color: 'neutral' })
			return
		}
		if (status.value === 'error') {
			toast.add({ title: '连接状态异常，请先测试连接', color: 'warning' })
			return
		}
		try {
			log('sync:push:start', { profileId: activeProfileId.value })
			const report = await pushToRemote()
			if (!report) {
				toast.add({ title: '同步进行中，请稍候', color: 'neutral' })
				return
			}
			status.value = 'ok'
			toast.add({
				title: '上传成功',
				description: `同步时间：${new Date(report.syncedAt).toLocaleString()} · ${summarizeRemoteSyncReport(report, '')}`,
				color: 'success',
			})
			log('sync:push:done', { syncedAt: report.syncedAt })
		} catch (error) {
			toast.add({ title: '上传失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('sync:push:error', error)
		}
	}

	async function handlePull() {
		if (testingCurrent.value || testingNew.value || testingEdit.value) {
			toast.add({ title: '请等待连接测试完成后再下载', color: 'neutral' })
			return
		}
		if (status.value === 'missing') {
			toast.add({ title: '请先配置并测试连接', color: 'neutral' })
			return
		}
		if (status.value === 'error') {
			toast.add({ title: '连接状态异常，请先测试连接', color: 'warning' })
			return
		}
		try {
			log('sync:pull:start', { profileId: activeProfileId.value })
			const report = await pullFromRemote()
			if (!report) {
				toast.add({ title: '同步进行中，请稍候', color: 'neutral' })
				return
			}
			refreshSignals.bumpProject()
			status.value = 'ok'
			toast.add({
				title: '下载成功',
				description: `同步时间：${new Date(report.syncedAt).toLocaleString()} · ${summarizeRemoteSyncReport(report, '')}`,
				color: 'success',
			})
			log('sync:pull:done', { syncedAt: report.syncedAt })
		} catch (error) {
			toast.add({ title: '下载失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('sync:pull:error', error)
		}
	}

	async function handleTestNew() {
		if (!canTestNew.value) return
		const validation = validateWithZod(postgresUrlSchema, newUrl.value)
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}
		try {
			log('test:new:start')
			testingNew.value = true
			status.value = 'testing'
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: newUrl.value.trim() } })
			status.value = 'ok'
			toast.add({ title: '连接成功', description: '数据库连接正常。', color: 'success' })
			log('test:new:done')
		} catch (error) {
			status.value = 'error'
			toast.add({ title: '连接失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('test:new:error', error)
		} finally {
			testingNew.value = false
		}
	}

	async function handleCreateProfile() {
		if (!canSaveNew.value) return
		const validation = validateWithZod(remoteProfileSchema, { name: newName.value, url: newUrl.value })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}
		try {
			log('create:start', { name: newName.value })
			savingNew.value = true
			await remoteSyncStore.addProfile({ name: newName.value.trim(), url: newUrl.value.trim() }, 'manual')
			newName.value = ''
			newUrl.value = ''
			createOpen.value = false
			status.value = 'ok'
			toast.add({ title: '已创建配置', description: '新配置已保存并设为当前。', color: 'success' })
			log('create:done')
		} catch (error) {
			toast.add({ title: '创建失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('create:error', error)
		} finally {
			savingNew.value = false
		}
	}

	async function handleTestEdit() {
		if (!canTestEdit.value) return
		const validation = validateWithZod(postgresUrlSchema, editUrl.value)
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}
		try {
			log('test:edit:start', { profileId: editProfileId.value })
			testingEdit.value = true
			status.value = 'testing'
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: editUrl.value.trim() } })
			status.value = 'ok'
			toast.add({ title: '连接成功', description: '数据库连接正常。', color: 'success' })
			log('test:edit:done')
		} catch (error) {
			status.value = 'error'
			toast.add({ title: '连接失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('test:edit:error', error)
		} finally {
			testingEdit.value = false
		}
	}

	async function handleSaveEdit() {
		if (!editProfileId.value || !canSaveEdit.value) return
		const validation = validateWithZod(remoteProfileSchema, { name: editName.value, url: editUrl.value })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}
		try {
			log('save:edit:start', { profileId: editProfileId.value })
			savingEdit.value = true
			await remoteSyncStore.updateProfileName(editProfileId.value, editName.value.trim())
			await remoteSyncStore.updateProfileUrl(editProfileId.value, editUrl.value.trim())
			editOpen.value = false
			status.value = 'ok'
			toast.add({ title: '保存成功', description: '配置已更新。', color: 'success' })
			log('save:edit:done')
		} catch (error) {
			toast.add({ title: '保存失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('save:edit:error', error)
		} finally {
			savingEdit.value = false
		}
	}

	async function setActive(profileId: string) {
		log('setActive:start', { profileId })
		try {
			await remoteSyncStore.setActiveProfile(profileId)
			status.value = 'missing'
			log('setActive:done', { profileId })
		} catch (error) {
			toast.add({
				title: '切换失败',
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
			logError('setActive:error', error)
		}
	}

	function openDelete(profile: RemoteDbProfile) {
		log('open:delete', { profileId: profile.id })
		deleteTarget.value = profile
	}

	async function confirmDelete() {
		if (!deleteTarget.value) return
		try {
			log('delete:start', { profileId: deleteTarget.value.id })
			deleting.value = true
			await remoteSyncStore.removeProfile(deleteTarget.value.id)
			deleteTarget.value = null
			status.value = remoteSyncStore.activeProfileId ? status.value : 'missing'
			toast.add({ title: '已删除配置', color: 'success' })
			log('delete:done')
		} catch (error) {
			toast.add({ title: '删除失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('delete:error', error)
		} finally {
			deleting.value = false
		}
	}

	async function handleImport() {
		importError.value = ''
		if (!canImport.value) return
		try {
			log('import:start')
			importing.value = true
			const parsed = JSON.parse(importText.value.trim())
			const validation = validateWithZod(remoteImportListSchema, parsed)
			if (!validation.ok) {
				importError.value = validation.message
				return
			}
			const items: RemoteDbProfileInput[] = validation.data.map((item) => ({
				name: item.name,
				url: item.url,
			}))
			await remoteSyncStore.importProfiles(items)
			importText.value = ''
			importOpen.value = false
			status.value = 'ok'
			toast.add({ title: '导入成功', description: `已导入 ${items.length} 条配置。`, color: 'success' })
			log('import:done', { count: items.length })
		} catch (error) {
			importError.value = '解析失败，请确认 JSON 格式'
			toast.add({ title: '导入失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('import:error', error)
		} finally {
			importing.value = false
		}
	}

	onMounted(async () => {
		log('mount:load:start')
		try {
			await remoteSyncStore.load()
			status.value = 'missing'
			log('mount:load:done', { activeProfileId: remoteSyncStore.activeProfileId })
		} catch (error) {
			status.value = 'error'
			toast.add({
				title: '读取配置失败',
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
			logError('mount:load:error', error)
		}
	})

	return {
		isPushing,
		isPulling,
		syncError,
		hasActiveProfile,
		lastPushedText,
		lastPulledText,
		lastPushSummaryText,
		lastPullSummaryText,
		historyFilter,
		historyFilterOptions,
		isClearingHistory,
		recentSyncHistory,
		setHistoryFilter,
		handleClearSyncHistory,
		handlePush,
		handlePull,
		profiles,
		activeProfileId,
		activeProfile,
		statusMessage,
		statusLabel,
		statusBadgeVariant,
		statusBadgeClass,
		testingCurrent,
		handleTestCurrent,
		openCreate,
		openImport,
		openEdit,
		setActive,
		openDelete,
		formatProfileMeta,
		createOpen,
		newName,
		newUrl,
		canSaveNew,
		canTestNew,
		testingNew,
		savingNew,
		handleTestNew,
		handleCreateProfile,
		editOpen,
		editName,
		editUrl,
		canSaveEdit,
		canTestEdit,
		testingEdit,
		savingEdit,
		handleTestEdit,
		handleSaveEdit,
		importOpen,
		importText,
		importError,
		canImport,
		importing,
		handleImport,
		deleteOpen,
		deleteTarget,
		deleting,
		confirmDelete,
	}
}
