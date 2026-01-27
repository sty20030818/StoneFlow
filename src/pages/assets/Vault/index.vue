<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 搜索 + 新建 -->
		<header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-default">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-lock"
						class="text-yellow-500" />
					<span>Vault</span>
				</div>
				<div class="text-xs text-muted">密钥保险箱 · 安全存储 API Key / Token / 密码 / 配置</div>
			</div>

			<div class="flex items-center gap-2">
				<UInput
					v-model="searchKeyword"
					icon="i-lucide-search"
					placeholder="搜索名称、分组…"
					size="sm"
					class="w-64" />

				<UButton
					color="primary"
					size="sm"
					icon="i-lucide-plus"
					@click="onCreateNew">
					新建
				</UButton>
			</div>
		</header>

		<!-- 主体：左侧分组 + 中间列表 + 右侧编辑 -->
		<div class="flex-1 min-h-0 flex gap-4 mt-4">
			<!-- 左侧：分组列表 -->
			<aside class="w-48 shrink-0 border-r border-default pr-4">
				<div class="space-y-2">
					<button
						type="button"
						class="w-full text-left px-2 py-1.5 rounded-lg text-sm transition"
						:class="selectedFolder === null ? 'bg-elevated text-default' : 'text-muted hover:bg-elevated/60'"
						@click="selectedFolder = null">
						<div class="flex items-center gap-2">
							<UIcon
								name="i-lucide-folder"
								class="size-4" />
							<span>所有条目</span>
						</div>
					</button>

					<div
						v-for="folder in folders"
						:key="folder"
						class="space-y-0.5">
						<button
							type="button"
							class="w-full text-left px-2 py-1.5 rounded-lg text-sm transition"
							:class="selectedFolder === folder ? 'bg-elevated text-default' : 'text-muted hover:bg-elevated/60'"
							@click="selectedFolder = folder">
							<div class="flex items-center gap-2">
								<UIcon
									name="i-lucide-folder-open"
									class="size-4" />
								<span class="truncate">{{ folder }}</span>
							</div>
						</button>
					</div>
				</div>
			</aside>

			<!-- 中间：条目列表 -->
			<main class="flex-1 min-w-0 overflow-y-auto">
				<div
					v-if="filteredEntries.length === 0 && !loading"
					class="text-sm text-muted py-8 text-center">
					暂无密钥条目。点击「新建」创建第一个条目。
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="e in filteredEntries"
						:key="e.id"
						class="p-3 rounded-lg border border-default bg-elevated/80 cursor-pointer hover:bg-default transition"
						:class="selectedEntry?.id === e.id ? 'ring-2 ring-primary' : ''"
						@click="selectEntry(e)">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-sm font-medium truncate">{{ e.name }}</span>
									<UBadge
										color="neutral"
										variant="soft"
										size="2xs">
										{{ typeLabel(e.type) }}
									</UBadge>
									<UBadge
										v-if="e.folder"
										color="primary"
										variant="soft"
										size="2xs">
										{{ e.folder }}
									</UBadge>
								</div>
								<div class="text-xs text-muted line-clamp-1">
									{{ e.value.substring(0, 30) }}{{ e.value.length > 30 ? '...' : '' }}
								</div>
								<div
									v-if="e.note"
									class="text-xs text-muted mt-1 line-clamp-1">
									{{ e.note }}
								</div>
							</div>
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								icon="i-lucide-trash-2"
								@click.stop="onDelete(e.id)">
								<span class="sr-only">删除</span>
							</UButton>
						</div>
					</div>
				</div>
			</main>

			<!-- 右侧：编辑区 -->
			<aside
				v-if="selectedEntry"
				class="w-96 shrink-0 border-l border-default pl-4 overflow-y-auto">
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-semibold">编辑条目</span>
						<UButton
							color="neutral"
							variant="ghost"
							size="2xs"
							icon="i-lucide-x"
							@click="selectedEntry = null">
							<span class="sr-only">关闭</span>
						</UButton>
					</div>

					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">名称</label>
						<UInput
							v-model="editForm.name"
							placeholder="条目名称"
							size="sm" />
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div class="space-y-2">
							<label class="text-[11px] font-medium text-muted uppercase tracking-wide">类型</label>
							<USelectMenu
								v-model="editForm.type"
								:options="typeOptions"
								value-attribute="value"
								option-attribute="label"
								size="sm" />
						</div>
						<div class="space-y-2">
							<label class="text-[11px] font-medium text-muted uppercase tracking-wide">分组</label>
							<UInput
								v-model="editForm.folder"
								placeholder="Folder 名称"
								size="sm" />
						</div>
					</div>

					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">值</label>
						<div class="relative">
							<UInput
								v-model="editForm.value"
								:type="showValue ? 'text' : 'password'"
								placeholder="密钥值"
								size="sm" />
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								:icon="showValue ? 'i-lucide-eye-off' : 'i-lucide-eye'"
								class="absolute right-1 top-1/2 -translate-y-1/2"
								@click="showValue = !showValue">
								<span class="sr-only">显示/隐藏</span>
							</UButton>
						</div>
					</div>

					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">备注</label>
						<UTextarea
							v-model="editForm.note"
							placeholder="可选备注信息"
							:rows="3"
							autoresize />
					</div>

					<div class="flex items-center gap-2 pt-2">
						<UButton
							color="primary"
							size="sm"
							icon="i-lucide-copy"
							@click="onCopy">
							复制值
						</UButton>
						<UButton
							color="primary"
							size="sm"
							class="flex-1"
							@click="onSave">
							保存
						</UButton>
						<UButton
							color="neutral"
							variant="ghost"
							size="sm"
							@click="selectedEntry = null">
							取消
						</UButton>
					</div>
				</div>
			</aside>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'

	import type { VaultEntryDto, VaultEntryType } from '@/services/api/vault'
	import { createVaultEntry, deleteVaultEntry, listVaultEntries, updateVaultEntry } from '@/services/api/vault'

	const toast = useToast()

	const loading = ref(false)
	const entries = ref<VaultEntryDto[]>([])
	const selectedEntry = ref<VaultEntryDto | null>(null)
	const selectedFolder = ref<string | null>(null)
	const searchKeyword = ref('')
	const showValue = ref(false)

	const editForm = ref({
		name: '',
		type: 'api_key' as VaultEntryType,
		value: '',
		folder: null as string | null,
		note: null as string | null,
	})

	const typeOptions = [
		{ label: 'API Key', value: 'api_key' },
		{ label: 'Token', value: 'token' },
		{ label: '密码', value: 'password' },
		{ label: '配置', value: 'config' },
	]

	function typeLabel(type: VaultEntryType): string {
		const found = typeOptions.find((o) => o.value === type)
		return found?.label ?? type
	}

	const folders = computed(() => {
		const set = new Set<string>()
		for (const e of entries.value) {
			if (e.folder) set.add(e.folder)
		}
		return Array.from(set).sort()
	})

	const filteredEntries = computed(() => {
		let result = entries.value

		if (selectedFolder.value !== null) {
			result = result.filter((e) => e.folder === selectedFolder.value)
		}

		if (searchKeyword.value.trim()) {
			const kw = searchKeyword.value.trim().toLowerCase()
			result = result.filter((e) => {
				if (e.name.toLowerCase().includes(kw)) return true
				if (e.folder && e.folder.toLowerCase().includes(kw)) return true
				return false
			})
		}

		return result.sort((a, b) => b.updated_at - a.updated_at)
	})

	function selectEntry(e: VaultEntryDto) {
		selectedEntry.value = e
		editForm.value = {
			name: e.name,
			type: e.type,
			value: e.value,
			folder: e.folder,
			note: e.note,
		}
		showValue.value = false
	}

	function onCreateNew() {
		const newEntry: VaultEntryDto = {
			id: '',
			name: '',
			type: 'api_key',
			value: '',
			folder: null,
			note: null,
			created_at: Date.now(),
			updated_at: Date.now(),
		}
		selectEntry(newEntry)
	}

	async function onCopy() {
		if (!editForm.value.value) {
			toast.add({ title: '没有可复制的内容', color: 'neutral' })
			return
		}
		try {
			await navigator.clipboard.writeText(editForm.value.value)
			toast.add({ title: '已复制到剪贴板', color: 'success' })
			setTimeout(() => {
				showValue.value = false
			}, 2000)
		} catch (e) {
			toast.add({
				title: '复制失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	async function onSave() {
		if (!selectedEntry.value) return
		if (!editForm.value.name.trim()) {
			toast.add({ title: '名称不能为空', color: 'error' })
			return
		}
		if (!editForm.value.value.trim()) {
			toast.add({ title: '值不能为空', color: 'error' })
			return
		}

		try {
			if (selectedEntry.value.id) {
				await updateVaultEntry(selectedEntry.value.id, editForm.value)
				toast.add({ title: '已保存', color: 'success' })
			} else {
				await createVaultEntry(editForm.value)
				toast.add({ title: '已创建', color: 'success' })
			}
			await refresh()
			selectedEntry.value = null
		} catch (e) {
			toast.add({
				title: '保存失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	async function onDelete(id: string) {
		try {
			await deleteVaultEntry(id)
			toast.add({ title: '已删除', color: 'success' })
			if (selectedEntry.value?.id === id) {
				selectedEntry.value = null
			}
			await refresh()
		} catch (e) {
			toast.add({
				title: '删除失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	async function refresh() {
		loading.value = true
		try {
			entries.value = await listVaultEntries()
		} catch (e) {
			toast.add({
				title: '加载失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			loading.value = false
		}
	}

	onMounted(async () => {
		await refresh()
	})
</script>
