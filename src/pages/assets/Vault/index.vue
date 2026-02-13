<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 搜索 + 新建 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 border-b border-default pb-3 lg:flex-row lg:items-center lg:justify-between">
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

		<!-- 主体：左侧分组 + 列表 -->
		<div
			v-motion="layoutMotion"
			class="mt-4 flex flex-1 min-h-0 gap-4">
			<aside
				v-motion="folderMotion"
				class="w-48 shrink-0 border-r border-default pr-4">
				<div class="space-y-2">
					<button
						type="button"
						class="w-full rounded-lg px-2 py-1.5 text-left text-sm transition"
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
							class="w-full rounded-lg px-2 py-1.5 text-left text-sm transition"
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

			<main
				v-motion="listMotion"
				class="flex-1 min-w-0 overflow-y-auto">
				<div
					v-if="filteredEntries.length === 0 && !loading"
					class="py-8 text-center text-sm text-muted">
					暂无密钥条目。点击「新建」创建第一个条目。
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="(entry, index) in filteredEntries"
						:key="entry.id"
						v-motion="entryItemMotions[index]"
						class="cursor-pointer rounded-lg border border-default bg-elevated/80 p-3 transition hover:bg-default"
						:class="selectedEntry?.id === entry.id && editOpen ? 'ring-2 ring-primary' : ''"
						@click="openEditor(entry)">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex items-center gap-2">
									<span class="truncate text-sm font-medium">{{ entry.name }}</span>
									<UBadge
										color="neutral"
										variant="soft"
										size="2xs">
										{{ typeLabel(entry.type) }}
									</UBadge>
									<UBadge
										v-if="entry.folder"
										color="primary"
										variant="soft"
										size="2xs">
										{{ entry.folder }}
									</UBadge>
								</div>
								<div class="line-clamp-1 text-xs text-muted">
									{{ entry.value.substring(0, 30) }}{{ entry.value.length > 30 ? '...' : '' }}
								</div>
								<div
									v-if="entry.note"
									class="mt-1 line-clamp-1 text-xs text-muted">
									{{ entry.note }}
								</div>
							</div>
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								icon="i-lucide-trash-2"
								@click.stop="onDelete(entry.id)">
								<span class="sr-only">删除</span>
							</UButton>
						</div>
					</div>
				</div>
			</main>
		</div>

		<UModal
			v-model:open="editOpen"
			:title="selectedEntry?.id ? '编辑密钥条目' : '新建密钥条目'"
			description="统一在弹窗中维护敏感字段，减少页面暴露时间。"
			:ui="vaultModalUi">
			<template #body>
				<div
					v-motion="modalBodyMotion"
					class="space-y-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<UFormField
							label="名称"
							required>
							<UInput
								v-model="editForm.name"
								placeholder="条目名称"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>
						<UFormField label="类型">
							<USelectMenu
								v-model="editForm.type"
								:items="typeOptions"
								value-key="value"
								label-key="label"
								size="md"
								class="w-full"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
						</UFormField>
					</div>

					<UFormField label="分组（可选）">
						<UInput
							v-model="editForm.folder"
							placeholder="可选：例如 cloud / personal / devops"
							size="md"
							class="w-full"
							:ui="assetModalInputUi" />
					</UFormField>

					<UFormField
						label="值"
						required>
						<div class="relative">
							<UInput
								v-model="editForm.value"
								:type="showValue ? 'text' : 'password'"
								placeholder="密钥值"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								:icon="showValue ? 'i-lucide-eye-off' : 'i-lucide-eye'"
								class="absolute top-1/2 right-1 -translate-y-1/2"
								@click="showValue = !showValue">
								<span class="sr-only">显示/隐藏</span>
							</UButton>
						</div>
					</UFormField>

					<UFormField label="备注（可选）">
						<UTextarea
							v-model="editForm.note"
							placeholder="可选备注信息"
							:rows="3"
							size="md"
							class="w-full"
							autoresize
							:ui="assetModalTextareaUi" />
					</UFormField>
				</div>
			</template>

			<template #footer>
				<div
					v-motion="modalFooterMotion"
					class="flex items-center justify-end gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						size="sm"
						@click="closeEditor">
						取消
					</UButton>
					<UButton
						color="primary"
						variant="soft"
						size="sm"
						icon="i-lucide-copy"
						@click="onCopy">
						复制值
					</UButton>
					<UButton
						color="primary"
						size="sm"
						@click="onSave">
						保存
					</UButton>
				</div>
			</template>
		</UModal>
	</section>
</template>

<script setup lang="ts">
	import { refDebounced, useAsyncState, useClipboard, useTimeoutFn } from '@vueuse/core'
	import { computed, ref } from 'vue'

	import { getAppStaggerDelay, useAppMotionPreset, useMotionPreset, useMotionPresetWithDelay, withMotionDelay } from '@/composables/base/motion'
	import { validateWithZod } from '@/composables/base/zod'
	import { createModalLayerUi } from '@/config/ui-layer'
	import { vaultSubmitSchema } from '@/composables/domain/validation/forms'
	import { assetModalInputUi, assetModalSelectMenuUi, assetModalTextareaUi } from '../shared/modal-form-ui'
	import type { VaultEntryDto, VaultEntryType } from '@/services/api/vault'
	import { createVaultEntry, deleteVaultEntry, listVaultEntries, updateVaultEntry } from '@/services/api/vault'

	const toast = useToast()
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppMotionPreset('drawerSection', 'sectionBase', 18)
	const folderMotion = useAppMotionPreset('card', 'sectionBase', 30)
	const listMotion = useAppMotionPreset('drawerSection', 'sectionBase', 42)
	const entryItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useMotionPreset('modalSection')
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 20)
	const vaultModalUi = createModalLayerUi({
		width: 'sm:max-w-2xl',
		rounded: 'rounded-2xl',
	})

	const selectedEntry = ref<VaultEntryDto | null>(null)
	const editOpen = ref(false)
	const selectedFolder = ref<string | null>(null)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const {
		state: entries,
		isLoading: loading,
		execute: executeRefresh,
	} = useAsyncState(() => listVaultEntries(), [] as VaultEntryDto[], {
		immediate: true,
		resetOnExecute: false,
		onError: (e) => {
			toast.add({
				title: '加载失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		},
	})

	const showValue = ref(false)
	const { copy } = useClipboard()
	const { start: hideValueLater, stop: stopHideValueTimer } = useTimeoutFn(
		() => {
			showValue.value = false
		},
		2000,
		{ immediate: false },
	)

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
		const found = typeOptions.find((option) => option.value === type)
		return found?.label ?? type
	}

	const folders = computed(() => {
		const set = new Set<string>()
		for (const entry of entries.value) {
			if (entry.folder) set.add(entry.folder)
		}
		return Array.from(set).sort()
	})

	const filteredEntries = computed(() => {
		let result = entries.value

		if (selectedFolder.value !== null) {
			result = result.filter((entry) => entry.folder === selectedFolder.value)
		}

		if (debouncedSearchKeyword.value.trim()) {
			const keyword = debouncedSearchKeyword.value.trim().toLowerCase()
			result = result.filter((entry) => {
				if (entry.name.toLowerCase().includes(keyword)) return true
				if (entry.folder && entry.folder.toLowerCase().includes(keyword)) return true
				return false
			})
		}

		return result.sort((a, b) => b.updatedAt - a.updatedAt)
	})

	const entryItemMotions = computed(() =>
		filteredEntries.value.map((_entry, index) =>
			withMotionDelay(entryItemPreset.value, getAppStaggerDelay(index)),
		),
	)

	function openEditor(entry: VaultEntryDto) {
		selectedEntry.value = entry
		editForm.value = {
			name: entry.name,
			type: entry.type,
			value: entry.value,
			folder: entry.folder,
			note: entry.note,
		}
		showValue.value = false
		editOpen.value = true
	}

	function onCreateNew() {
		openEditor({
			id: '',
			name: '',
			type: 'api_key',
			value: '',
			folder: null,
			note: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
	}

	function closeEditor() {
		editOpen.value = false
		selectedEntry.value = null
		showValue.value = false
		stopHideValueTimer()
	}

	async function onCopy() {
		if (!editForm.value.value) {
			toast.add({ title: '没有可复制的内容', color: 'neutral' })
			return
		}
		try {
			await copy(editForm.value.value)
			toast.add({ title: '已复制到剪贴板', color: 'success' })
			stopHideValueTimer()
			hideValueLater()
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
		const validation = validateWithZod(vaultSubmitSchema, {
			name: editForm.value.name,
			value: editForm.value.value,
		})
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
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
			closeEditor()
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
				closeEditor()
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
		await executeRefresh(0)
	}
</script>
