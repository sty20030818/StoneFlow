<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 搜索 + 新建 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 border-b border-default pb-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-notebook"
						class="text-pink-500" />
					<span>Notes</span>
				</div>
				<div class="text-xs text-muted">通用 Markdown 笔记 · 与 Project / Task 弱关联</div>
			</div>

			<div class="flex items-center gap-2">
				<UInput
					v-model="searchKeyword"
					icon="i-lucide-search"
					placeholder="搜索标题、内容…"
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

		<div
			v-motion="layoutMotion"
			class="mt-4 flex-1 min-h-0 overflow-y-auto">
			<div
				v-if="filteredNotes.length === 0 && !loading"
				class="py-8 text-center text-sm text-muted">
				暂无笔记。点击「新建」创建第一篇笔记。
			</div>

			<div
				v-else
				class="space-y-2">
				<div
					v-for="(note, index) in filteredNotes"
					:key="note.id"
					v-motion="noteItemMotions[index]"
					class="cursor-pointer rounded-lg border border-default bg-elevated/80 p-3 transition hover:bg-default"
					:class="selectedNote?.id === note.id && editOpen ? 'ring-2 ring-primary' : ''"
					@click="openEditor(note)">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							<div class="mb-1 truncate text-sm font-medium">{{ note.title || '无标题' }}</div>
							<div class="line-clamp-2 text-xs text-muted">
								{{ note.content.substring(0, 80) }}{{ note.content.length > 80 ? '...' : '' }}
							</div>
							<div class="mt-1.5 flex items-center gap-1.5">
								<UBadge
									v-if="note.linkedProjectId"
									color="primary"
									variant="soft"
									size="2xs">
									Project
								</UBadge>
								<UBadge
									v-if="note.linkedTaskId"
									color="success"
									variant="soft"
									size="2xs">
									Task
								</UBadge>
							</div>
						</div>
						<UButton
							color="neutral"
							variant="ghost"
							size="2xs"
							icon="i-lucide-trash-2"
							@click.stop="onDelete(note.id)">
							<span class="sr-only">删除</span>
						</UButton>
					</div>
				</div>
			</div>
		</div>

		<UModal
			v-model:open="editOpen"
			:title="selectedNote?.id ? '编辑笔记' : '新建笔记'"
			description="统一在弹窗中完成编辑，专注当前笔记内容。"
			:ui="noteModalUi">
			<template #body>
				<div
					v-motion="modalBodyMotion"
					class="space-y-4">
					<UFormField
						label="标题"
						required>
						<UInput
							v-model="editForm.title"
							placeholder="笔记标题"
							size="md"
							class="w-full"
							:ui="assetModalInputUi" />
					</UFormField>

					<UFormField
						label="内容（Markdown）"
						required>
						<UTextarea
							v-model="editForm.content"
							placeholder="输入 Markdown 内容…"
							:rows="14"
							size="md"
							class="w-full"
							autoresize
							:ui="assetModalTextareaUi" />
					</UFormField>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<UFormField label="关联 Project ID（可选）">
							<UInput
								v-model="editForm.linkedProjectId"
								placeholder="project:xxx（可选）"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>
						<UFormField label="关联 Task ID（可选）">
							<UInput
								v-model="editForm.linkedTaskId"
								placeholder="task:xxx（可选）"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>
					</div>
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
	import { noteSubmitSchema } from '@/composables/domain/validation/forms'
	import { assetModalInputUi, assetModalTextareaUi } from '../shared/modal-form-ui'
	import type { NoteDto } from '@/services/api/notes'
	import { createNote, deleteNote, listNotes, updateNote } from '@/services/api/notes'

	const toast = useToast()
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppMotionPreset('drawerSection', 'sectionBase', 18)
	const noteItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useMotionPreset('modalSection')
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 20)
	const noteModalUi = createModalLayerUi({
		width: 'sm:max-w-3xl',
		rounded: 'rounded-2xl',
	})

	const selectedNote = ref<NoteDto | null>(null)
	const editOpen = ref(false)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const {
		state: notes,
		isLoading: loading,
		execute: executeRefresh,
	} = useAsyncState(() => listNotes(), [] as NoteDto[], {
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

	const editForm = ref({
		title: '',
		content: '',
		linkedProjectId: null as string | null,
		linkedTaskId: null as string | null,
	})

	const filteredNotes = computed(() => {
		let result = notes.value

		if (debouncedSearchKeyword.value.trim()) {
			const keyword = debouncedSearchKeyword.value.trim().toLowerCase()
			result = result.filter((note) => {
				if (note.title.toLowerCase().includes(keyword)) return true
				if (note.content.toLowerCase().includes(keyword)) return true
				return false
			})
		}

		return result.sort((a, b) => b.updatedAt - a.updatedAt)
	})

	const noteItemMotions = computed(() =>
		createStaggeredEnterMotions(filteredNotes.value.length, noteItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	function openEditor(note: NoteDto) {
		selectedNote.value = note
		editForm.value = {
			title: note.title,
			content: note.content,
			linkedProjectId: note.linkedProjectId,
			linkedTaskId: note.linkedTaskId,
		}
		editOpen.value = true
	}

	function onCreateNew() {
		openEditor({
			id: '',
			title: '',
			content: '',
			linkedProjectId: null,
			linkedTaskId: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
	}

	function closeEditor() {
		editOpen.value = false
		selectedNote.value = null
	}

	async function onSave() {
		if (!selectedNote.value) return
		const validation = validateWithZod(noteSubmitSchema, { title: editForm.value.title })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}

		try {
			if (selectedNote.value.id) {
				await updateNote(selectedNote.value.id, editForm.value)
				toast.add({ title: '已保存', color: 'success' })
			} else {
				await createNote(editForm.value)
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
			await deleteNote(id)
			toast.add({ title: '已删除', color: 'success' })
			if (selectedNote.value?.id === id) {
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
