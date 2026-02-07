import { useNow } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { useRemoteSyncActions } from '@/composables/useRemoteSyncActions'
import { tauriInvoke } from '@/services/tauri/invoke'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteDbProfile, RemoteDbProfileInput } from '@/types/shared/remote-sync'

export function useRemoteSyncPage() {
	const remoteSyncStore = useRemoteSyncStore()
	const refreshSignals = useRefreshSignalsStore()
	const toast = useToast()
	const logPrefix = '[settings-remote-sync]'
	const now = useNow({ interval: 60_000 })

	const {
		isPushing,
		isPulling,
		syncError,
		lastPushedAt,
		lastPulledAt,
		hasActiveProfile,
		pushToRemote,
		pullFromRemote,
	} = useRemoteSyncActions()

	function log(...args: unknown[]) {
		console.log(logPrefix, ...args)
	}

	function logError(...args: unknown[]) {
		console.error(logPrefix, ...args)
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

	const canSaveNew = computed(() => newName.value.trim().length > 0 && validateUrl(newUrl.value))
	const canTestNew = computed(() => validateUrl(newUrl.value))
	const canSaveEdit = computed(() => editName.value.trim().length > 0 && validateUrl(editUrl.value))
	const canTestEdit = computed(() => validateUrl(editUrl.value))
	const canImport = computed(() => importText.value.trim().length > 0)

	const deleteOpen = computed({
		get: () => !!deleteTarget.value,
		set: (val) => {
			if (!val) deleteTarget.value = null
		},
	})

	const lastPushedText = computed(() => {
		const ts = lastPushedAt.value
		if (!Number.isFinite(ts) || ts <= 0) return '未上传'
		void now.value
		return formatDistanceToNow(ts, { addSuffix: true, locale: zhCN })
	})

	const lastPulledText = computed(() => {
		const ts = lastPulledAt.value
		if (!Number.isFinite(ts) || ts <= 0) return '未下载'
		void now.value
		return formatDistanceToNow(ts, { addSuffix: true, locale: zhCN })
	})

	function validateUrl(url: string) {
		const trimmed = url.trim()
		return trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://')
	}

	function formatProfileMeta(profile: RemoteDbProfile) {
		const source = profile.source === 'import' ? '导入' : '手动'
		return `${source} · ${new Date(profile.updatedAt).toLocaleString()}`
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
		try {
			const ts = await pushToRemote()
			if (!ts) return
			toast.add({ title: '上传成功', description: `同步时间：${new Date(ts).toLocaleString()}`, color: 'success' })
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
		try {
			const ts = await pullFromRemote()
			if (!ts) return
			refreshSignals.bumpProject()
			toast.add({ title: '下载成功', description: `同步时间：${new Date(ts).toLocaleString()}`, color: 'success' })
		} catch (error) {
			toast.add({ title: '下载失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
			logError('sync:pull:error', error)
		}
	}

	async function handleTestNew() {
		if (!canTestNew.value) return
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
			if (!Array.isArray(parsed)) {
				importError.value = '导入内容必须是 JSON 数组'
				return
			}
			const items: RemoteDbProfileInput[] = []
			for (const item of parsed) {
				if (!item || typeof item !== 'object') continue
				const name = typeof item.name === 'string' ? item.name : ''
				const url = typeof item.url === 'string' ? item.url : ''
				if (!name || !validateUrl(url)) continue
				items.push({ name, url })
			}
			if (items.length === 0) {
				importError.value = '未找到合法的 name/url 记录'
				return
			}
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
