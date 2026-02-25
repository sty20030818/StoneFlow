<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 搜索 + 新建 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 border-b border-default pb-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-code"
						class="text-cyan-500" />
					<span>{{ t('assets.snippets.title') }}</span>
				</div>
				<div class="text-xs text-muted">{{ t('assets.snippets.subtitle') }}</div>
			</div>

			<div class="flex items-center gap-2">
				<UInput
					v-model="searchKeyword"
					icon="i-lucide-search"
					:placeholder="t('assets.snippets.searchPlaceholder')"
					size="sm"
					class="w-64" />

				<UButton
					color="primary"
					size="sm"
					icon="i-lucide-plus"
					@click="onCreateNew">
					{{ t('common.actions.new') }}
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
							<span>{{ t('assets.snippets.allItems') }}</span>
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
					v-if="filteredSnippets.length === 0 && !loading"
					class="py-8 text-center text-sm text-muted">
					{{ t('assets.snippets.empty') }}
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="(snippet, index) in filteredSnippets"
						:key="snippet.id"
						v-motion="snippetItemMotions[index]"
						class="cursor-pointer rounded-lg border border-default bg-elevated/80 p-3 transition hover:bg-default"
						:class="selectedSnippet?.id === snippet.id && editOpen ? 'ring-2 ring-primary' : ''"
						@click="openEditor(snippet)">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex items-center gap-2">
									<span class="truncate text-sm font-medium">{{ snippet.title }}</span>
									<UBadge
										color="neutral"
										variant="soft"
										size="2xs">
										{{ snippet.language }}
									</UBadge>
									<UBadge
										v-if="snippet.folder"
										color="primary"
										variant="soft"
										size="2xs">
										{{ snippet.folder }}
									</UBadge>
								</div>
								<div class="mb-1.5 line-clamp-2 text-xs text-muted">
									{{ snippet.content.substring(0, 100) }}{{ snippet.content.length > 100 ? '...' : '' }}
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<UBadge
										v-for="tag in snippet.tags.slice(0, 3)"
										:key="tag"
										color="neutral"
										variant="subtle"
										size="2xs">
										{{ tag }}
									</UBadge>
									<span
										v-if="snippet.tags.length > 3"
										class="text-[10px] text-muted">
										+{{ snippet.tags.length - 3 }}
									</span>
								</div>
							</div>
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								icon="i-lucide-trash-2"
								@click.stop="onDelete(snippet.id)">
								<span class="sr-only">{{ t('common.actions.delete') }}</span>
							</UButton>
						</div>
					</div>
				</div>
			</main>
		</div>

		<UModal
			v-model:open="editOpen"
			:title="selectedSnippet?.id ? t('assets.snippets.modal.editTitle') : t('assets.snippets.modal.newTitle')"
			:description="t('assets.snippets.modal.description')"
			:ui="snippetModalUi">
			<template #body>
				<div
					v-motion="modalBodyMotion"
					class="space-y-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<UFormField
							:label="t('assets.snippets.fields.title')"
							required>
							<UInput
								v-model="editForm.title"
								:placeholder="t('assets.snippets.placeholders.title')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>
						<UFormField :label="t('assets.snippets.fields.language')">
							<UInput
								v-model="editForm.language"
								:placeholder="t('assets.snippets.placeholders.language')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>
					</div>

					<UFormField :label="t('assets.snippets.fields.folderOptional')">
						<UInput
							v-model="editForm.folder"
							:placeholder="t('assets.snippets.placeholders.folderOptional')"
							size="md"
							class="w-full"
							:ui="assetModalInputUi" />
					</UFormField>

					<UFormField
						:label="t('assets.snippets.fields.content')"
						required>
						<UTextarea
							v-model="editForm.content"
							:placeholder="t('assets.snippets.placeholders.content')"
							:rows="12"
							size="md"
							class="w-full"
							autoresize
							:ui="assetModalTextareaUi" />
					</UFormField>

					<UFormField :label="t('assets.snippets.fields.tagsOptional')">
						<UInput
							v-model="tagsInput"
							:placeholder="t('assets.snippets.placeholders.tags')"
							size="md"
							class="w-full"
							:ui="assetModalInputUi"
							@blur="onTagsBlur" />
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
						{{ t('common.actions.cancel') }}
					</UButton>
					<UButton
						color="primary"
						size="sm"
						@click="onSave">
						{{ t('common.actions.save') }}
					</UButton>
				</div>
			</template>
		</UModal>
	</section>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { refDebounced, useAsyncState } from '@vueuse/core'
	import { computed, ref } from 'vue'

	import {
		DEFAULT_STAGGER_MOTION_LIMIT,
		createStaggeredEnterMotions,
		getAppStaggerDelay,
		useAppMotionPreset,
		useMotionPreset,
		useMotionPresetWithDelay,
	} from '@/composables/base/motion'
	import { validateWithZod } from '@/composables/base/zod'
	import { createModalLayerUi } from '@/config/ui-layer'
	import { snippetSubmitSchema } from '@/composables/domain/validation/forms'
	import { assetModalInputUi, assetModalTextareaUi } from '../shared/modal-form-ui'
	import type { SnippetDto } from '@/services/api/snippets'
	import { createSnippet, deleteSnippet, listSnippets, updateSnippet } from '@/services/api/snippets'
	import { resolveErrorMessage } from '@/utils/error-message'

	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppMotionPreset('drawerSection', 'sectionBase', 18)
	const folderMotion = useAppMotionPreset('card', 'sectionBase', 30)
	const listMotion = useAppMotionPreset('drawerSection', 'sectionBase', 42)
	const snippetItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useMotionPreset('modalSection')
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 20)
	const snippetModalUi = createModalLayerUi({
		width: 'sm:max-w-3xl',
		rounded: 'rounded-2xl',
	})

	const selectedSnippet = ref<SnippetDto | null>(null)
	const editOpen = ref(false)
	const selectedFolder = ref<string | null>(null)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const {
		state: snippets,
		isLoading: loading,
		execute: executeRefresh,
	} = useAsyncState(() => listSnippets(), [] as SnippetDto[], {
		immediate: true,
		resetOnExecute: false,
		onError: (e) => {
			toast.add({
				title: t('assets.snippets.toast.loadFailedTitle'),
				description: resolveErrorMessage(e, t),
				color: 'error',
			})
		},
	})

	const editForm = ref({
		title: '',
		language: 'plaintext',
		content: '',
		folder: null as string | null,
		tags: [] as string[],
	})
	const tagsInput = ref('')

	const folders = computed(() => {
		const set = new Set<string>()
		for (const snippet of snippets.value) {
			if (snippet.folder) set.add(snippet.folder)
		}
		return Array.from(set).sort()
	})

	const filteredSnippets = computed(() => {
		let result = snippets.value

		if (selectedFolder.value !== null) {
			result = result.filter((snippet) => snippet.folder === selectedFolder.value)
		}

		if (debouncedSearchKeyword.value.trim()) {
			const keyword = debouncedSearchKeyword.value.trim().toLowerCase()
			result = result.filter((snippet) => {
				if (snippet.title.toLowerCase().includes(keyword)) return true
				if (snippet.content.toLowerCase().includes(keyword)) return true
				if (snippet.tags.some((tag) => tag.toLowerCase().includes(keyword))) return true
				return false
			})
		}

		return result.sort((a, b) => b.updatedAt - a.updatedAt)
	})

	const snippetItemMotions = computed(() =>
		createStaggeredEnterMotions(filteredSnippets.value.length, snippetItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	function openEditor(snippet: SnippetDto) {
		selectedSnippet.value = snippet
		editForm.value = {
			title: snippet.title,
			language: snippet.language,
			content: snippet.content,
			folder: snippet.folder,
			tags: [...snippet.tags],
		}
		tagsInput.value = snippet.tags.join(', ')
		editOpen.value = true
	}

	function onCreateNew() {
		openEditor({
			id: '',
			title: '',
			language: 'plaintext',
			content: '',
			folder: null,
			tags: [],
			linkedTaskId: null,
			linkedProjectId: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
	}

	function closeEditor() {
		editOpen.value = false
		selectedSnippet.value = null
	}

	function onTagsBlur() {
		editForm.value.tags = tagsInput.value
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean)
	}

	async function onSave() {
		if (!selectedSnippet.value) return
		const validation = validateWithZod(snippetSubmitSchema, { title: editForm.value.title })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}

		try {
			onTagsBlur()
			if (selectedSnippet.value.id) {
				await updateSnippet(selectedSnippet.value.id, editForm.value)
				toast.add({ title: t('assets.common.toast.savedTitle'), color: 'success' })
			} else {
				await createSnippet(editForm.value)
				toast.add({ title: t('assets.common.toast.createdTitle'), color: 'success' })
			}
			await refresh()
			closeEditor()
		} catch (e) {
			toast.add({
				title: t('assets.common.toast.saveFailedTitle'),
				description: resolveErrorMessage(e, t),
				color: 'error',
			})
		}
	}

	async function onDelete(id: string) {
		try {
			await deleteSnippet(id)
			toast.add({ title: t('assets.common.toast.deletedTitle'), color: 'success' })
			if (selectedSnippet.value?.id === id) {
				closeEditor()
			}
			await refresh()
		} catch (e) {
			toast.add({
				title: t('assets.common.toast.deleteFailedTitle'),
				description: resolveErrorMessage(e, t),
				color: 'error',
			})
		}
	}

	async function refresh() {
		await executeRefresh(0)
	}
</script>
