<template>
	<section class="max-w-5xl space-y-6">
		<div class="space-y-6 lg:sticky lg:top-4 lg:self-start">
			<UCard class="rounded-3xl border border-default/70 bg-default">
				<template #header>
					<div class="space-y-1">
						<div class="text-sm font-semibold text-default">同步操作</div>
					</div>
				</template>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-2">
						<UButton
							block
							color="primary"
							variant="solid"
							size="xl"
							icon="i-lucide-cloud-upload"
							:loading="isPushing"
							:disabled="isPulling || !hasActiveProfile"
							@click="handlePush">
							上传
						</UButton>
						<div class="text-center text-[11px] text-muted">最近上传：{{ lastPushedText }}</div>
					</div>
					<div class="space-y-2">
						<UButton
							block
							color="neutral"
							variant="soft"
							size="xl"
							icon="i-lucide-cloud-download"
							:loading="isPulling"
							:disabled="isPushing || !hasActiveProfile"
							@click="handlePull">
							下载
						</UButton>
						<div class="text-center text-[11px] text-muted">最近下载：{{ lastPulledText }}</div>
					</div>
				</div>

				<div
					v-if="syncError"
					class="mt-3 rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
					同步失败：{{ syncError }}
				</div>
			</UCard>
		</div>

		<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
			<div class="space-y-1">
				<div class="text-2xl font-semibold text-default">远端同步</div>
				<div class="text-sm text-muted">
					在应用内配置 Neon 数据库连接。支持多配置导入与切换，敏感信息使用 Stronghold 存储。
				</div>
			</div>
		</div>

		<div class="grid gap-6 lg:grid-cols-[1.25fr,0.95fr]">
			<div class="space-y-6">
				<UCard class="rounded-3xl bg-elevated/60 border border-default/70">
					<template #header>
						<div class="flex items-center justify-between">
							<div class="text-sm font-semibold">当前状态</div>
							<div class="flex items-center gap-2">
								<UButton
									color="primary"
									variant="soft"
									size="sm"
									:loading="testingCurrent"
									:disabled="!hasActiveProfile"
									icon="i-lucide-activity"
									@click="handleTestCurrent">
									测试当前配置
								</UButton>
								<UBadge
									color="neutral"
									:variant="statusBadgeVariant"
									:class="statusBadgeClass">
									{{ statusLabel }}
								</UBadge>
							</div>
						</div>
					</template>
					<div class="space-y-3">
						<div class="text-sm text-muted">
							{{ statusMessage }}
						</div>
						<div
							v-if="activeProfile"
							class="rounded-2xl border border-default/70 bg-default/70 px-4 py-3">
							<div class="text-xs text-muted">当前配置</div>
							<div class="text-sm font-semibold truncate">{{ activeProfile.name }}</div>
						</div>
						<div
							v-else
							class="text-xs text-muted">
							尚未选择配置。
						</div>
					</div>
				</UCard>

				<UCard class="rounded-3xl bg-default border border-default/70">
					<template #header>
						<div class="flex items-center justify-between">
							<div class="text-sm font-semibold">配置列表</div>
							<div class="flex items-center gap-2">
								<UButton
									color="neutral"
									variant="soft"
									size="xs"
									icon="i-lucide-plus"
									@click="openCreate">
									新建配置
								</UButton>
								<UButton
									color="neutral"
									variant="ghost"
									size="xs"
									icon="i-lucide-upload"
									@click="openImport">
									导入配置
								</UButton>
							</div>
						</div>
					</template>
					<div class="space-y-2">
						<div
							v-if="profiles.length === 0"
							class="text-sm text-muted">
							暂无配置
						</div>
						<div
							v-for="profile in profiles"
							:key="profile.id"
							class="flex items-center justify-between gap-3 rounded-2xl border border-default/70 bg-elevated/40 px-4 py-3">
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<div class="text-sm font-semibold truncate">{{ profile.name }}</div>
									<UBadge
										v-if="profile.id === activeProfileId"
										color="primary"
										variant="soft">
										当前
									</UBadge>
								</div>
								<div class="text-[11px] text-muted">
									{{ formatProfileMeta(profile) }}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<UButton
									v-if="profile.id !== activeProfileId"
									color="neutral"
									variant="soft"
									size="xs"
									@click="setActive(profile.id)">
									设为当前
								</UButton>
								<UButton
									color="neutral"
									variant="ghost"
									size="xs"
									icon="i-lucide-pen"
									@click="openEdit(profile)">
									编辑
								</UButton>
								<UButton
									color="neutral"
									variant="ghost"
									size="xs"
									icon="i-lucide-trash-2"
									@click="openDelete(profile)">
									删除
								</UButton>
							</div>
						</div>
					</div>
				</UCard>
			</div>
		</div>
	</section>

	<UModal
		v-model:open="createOpen"
		title="新建配置"
		:ui="{ footer: 'flex justify-end gap-2' }">
		<template #body>
			<div class="space-y-4">
				<UFormField
					label="名称"
					description="用于识别不同数据库">
					<UInput
						v-model="newName"
						placeholder="例如：主库" />
				</UFormField>

				<UFormField
					label="数据库地址"
					description="仅支持 postgres:// 或 postgresql:// 开头的连接字符串">
					<UTextarea
						v-model="newUrl"
						placeholder="postgresql://..."
						:rows="4"
						:ui="{ base: 'w-full' }"
						class="w-full font-mono text-xs" />
				</UFormField>
			</div>
		</template>
		<template #footer>
			<UButton
				color="neutral"
				variant="soft"
				:loading="testingNew"
				:disabled="!canTestNew"
				icon="i-lucide-activity"
				@click="handleTestNew">
				测试连接
			</UButton>
			<UButton
				color="neutral"
				variant="ghost"
				@click="createOpen = false">
				取消
			</UButton>
			<UButton
				color="primary"
				variant="solid"
				:loading="savingNew"
				:disabled="!canSaveNew"
				icon="i-lucide-plus"
				@click="handleCreateProfile">
				保存
			</UButton>
		</template>
	</UModal>

	<UModal
		v-model:open="editOpen"
		title="编辑配置">
		<template #body>
			<div class="space-y-4">
				<UFormField label="名称">
					<UInput
						v-model="editName"
						placeholder="配置名称" />
				</UFormField>

				<UFormField
					label="数据库地址"
					description="仅支持 postgres:// 或 postgresql:// 开头的连接字符串">
					<UTextarea
						v-model="editUrl"
						placeholder="postgresql://..."
						:rows="4"
						:ui="{ base: 'w-full' }"
						class="w-full font-mono text-xs" />
				</UFormField>
			</div>
		</template>
		<template #footer>
			<div class="flex justify-end gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					@click="editOpen = false">
					取消
				</UButton>
				<UButton
					color="neutral"
					variant="soft"
					:loading="testingEdit"
					:disabled="!canTestEdit"
					icon="i-lucide-activity"
					@click="handleTestEdit">
					测试连接
				</UButton>
				<UButton
					color="primary"
					variant="solid"
					:loading="savingEdit"
					:disabled="!canSaveEdit"
					icon="i-lucide-save"
					@click="handleSaveEdit">
					保存
				</UButton>
			</div>
		</template>
	</UModal>

	<UModal
		v-model:open="importOpen"
		title="导入配置">
		<template #body>
			<div class="space-y-3">
				<UFormField
					label="JSON 文本"
					description='格式示例：[{"name":"主库","url":"postgresql://..."}]'>
					<UTextarea
						v-model="importText"
						placeholder="粘贴 JSON 数组"
						:rows="6"
						class="font-mono text-xs" />
				</UFormField>
				<div
					v-if="importError"
					class="text-xs text-error">
					{{ importError }}
				</div>
			</div>
		</template>
		<template #footer>
			<div class="flex justify-end gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					@click="importOpen = false">
					取消
				</UButton>
				<UButton
					color="primary"
					variant="soft"
					:loading="importing"
					:disabled="!canImport"
					icon="i-lucide-upload"
					@click="handleImport">
					导入
				</UButton>
			</div>
		</template>
	</UModal>

	<UModal
		v-model:open="deleteOpen"
		title="删除配置">
		<template #body>
			<div class="space-y-2 text-sm text-muted">
				<div>确认删除「{{ deleteTarget?.name }}」？</div>
				<div class="text-xs text-muted">删除后将无法恢复，需要重新导入。</div>
			</div>
		</template>
		<template #footer>
			<div class="flex justify-end gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					@click="deleteOpen = false">
					取消
				</UButton>
				<UButton
					color="error"
					variant="solid"
					:loading="deleting"
					@click="confirmDelete">
					确认删除
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'
	import { formatDistanceToNow } from 'date-fns'
	import { zhCN } from 'date-fns/locale'

	import { useRemoteSyncActions } from '@/composables/useRemoteSyncActions'
	import type { RemoteDbProfile, RemoteDbProfileInput } from '@/types/shared/remote-sync'
	import { useRemoteSyncStore } from '@/stores/remote-sync'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { tauriInvoke } from '@/services/tauri/invoke'

	const remoteSyncStore = useRemoteSyncStore()
	const refreshSignals = useRefreshSignalsStore()
	const toast = useToast()
	const logPrefix = '[settings-remote-sync]'

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
		if (!lastPushedAt.value) return '未上传'
		return formatDistanceToNow(lastPushedAt.value, { addSuffix: true, locale: zhCN })
	})

	const lastPulledText = computed(() => {
		if (!lastPulledAt.value) return '未下载'
		return formatDistanceToNow(lastPulledAt.value, { addSuffix: true, locale: zhCN })
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
			status.value = remoteSyncStore.activeProfileId ? 'missing' : 'missing'
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
</script>
