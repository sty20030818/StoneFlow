<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 搜索 + 新建 -->
		<header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-default">
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

		<!-- 主体：左侧列表 + 右侧编辑 -->
		<div class="flex-1 min-h-0 flex gap-4 mt-4">
			<!-- 左侧：笔记列表 -->
			<aside class="w-64 shrink-0 border-r border-default pr-4 overflow-y-auto">
				<div
					v-if="filteredNotes.length === 0 && !loading"
					class="text-sm text-muted py-8 text-center">
					暂无笔记。点击「新建」创建第一篇笔记。
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="n in filteredNotes"
						:key="n.id"
						class="p-3 rounded-lg border border-default bg-elevated/80 cursor-pointer hover:bg-default transition"
						:class="selectedNote?.id === n.id ? 'ring-2 ring-primary' : ''"
						@click="selectNote(n)">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="text-sm font-medium truncate mb-1">{{ n.title || '无标题' }}</div>
								<div class="text-xs text-muted line-clamp-2">
									{{ n.content.substring(0, 80) }}{{ n.content.length > 80 ? '...' : '' }}
								</div>
								<div class="flex items-center gap-1.5 mt-1.5">
									<UBadge
										v-if="n.linkedProjectId"
										color="primary"
										variant="soft"
										size="2xs">
										Project
									</UBadge>
									<UBadge
										v-if="n.linkedTaskId"
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
								@click.stop="onDelete(n.id)">
								<span class="sr-only">删除</span>
							</UButton>
						</div>
					</div>
				</div>
			</aside>

			<!-- 右侧：编辑区 -->
			<main class="flex-1 min-w-0 overflow-y-auto">
				<div
					v-if="!selectedNote"
					class="flex items-center justify-center h-full text-sm text-muted">
					选择左侧笔记或点击「新建」开始编辑
				</div>

				<div
					v-else
					class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-semibold">编辑笔记</span>
						<UButton
							color="neutral"
							variant="ghost"
							size="sm"
							@click="selectedNote = null">
							关闭
						</UButton>
					</div>

					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">标题</label>
						<UInput
							v-model="editForm.title"
							placeholder="笔记标题"
							size="sm" />
					</div>

					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">内容（Markdown）</label>
						<UTextarea
							v-model="editForm.content"
							placeholder="输入 Markdown 内容…&#10;&#10;引用 Task: task:xxx&#10;引用 Project: project:xxx"
							:rows="20"
							autoresize />
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div class="space-y-2">
							<label class="text-[11px] font-medium text-muted uppercase tracking-wide">关联 Project ID</label>
							<UInput
								v-model="editForm.linkedProjectId"
								placeholder="project:xxx（可选）"
								size="sm" />
						</div>
						<div class="space-y-2">
							<label class="text-[11px] font-medium text-muted uppercase tracking-wide">关联 Task ID</label>
							<UInput
								v-model="editForm.linkedTaskId"
								placeholder="task:xxx（可选）"
								size="sm" />
						</div>
					</div>

					<div class="flex items-center gap-2 pt-2">
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
							@click="selectedNote = null">
							取消
						</UButton>
					</div>
				</div>
			</main>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { refDebounced } from '@vueuse/core'
	import { computed, onMounted, ref } from 'vue'

	import type { NoteDto } from '@/services/api/notes'
	import { createNote, deleteNote, listNotes, updateNote } from '@/services/api/notes'

	const toast = useToast()

	const loading = ref(false)
	const notes = ref<NoteDto[]>([])
	const selectedNote = ref<NoteDto | null>(null)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)

	const editForm = ref({
		title: '',
		content: '',
		linkedProjectId: null as string | null,
		linkedTaskId: null as string | null,
	})

	const filteredNotes = computed(() => {
		let result = notes.value

		if (debouncedSearchKeyword.value.trim()) {
			const kw = debouncedSearchKeyword.value.trim().toLowerCase()
			result = result.filter((n) => {
				if (n.title.toLowerCase().includes(kw)) return true
				if (n.content.toLowerCase().includes(kw)) return true
				return false
			})
		}

		return result.sort((a, b) => b.updatedAt - a.updatedAt)
	})

	function selectNote(n: NoteDto) {
		selectedNote.value = n
		editForm.value = {
			title: n.title,
			content: n.content,
			linkedProjectId: n.linkedProjectId,
			linkedTaskId: n.linkedTaskId,
		}
	}

	function onCreateNew() {
		const newNote: NoteDto = {
			id: '',
			title: '',
			content: '',
			linkedProjectId: null,
			linkedTaskId: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}
		selectNote(newNote)
	}

	async function onSave() {
		if (!selectedNote.value) return
		if (!editForm.value.title.trim()) {
			toast.add({ title: '标题不能为空', color: 'error' })
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
			selectedNote.value = null
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
				selectedNote.value = null
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
			notes.value = await listNotes()
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
