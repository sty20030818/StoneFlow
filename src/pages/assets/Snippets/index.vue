<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 搜索 + 新建 -->
		<header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-default">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-code"
						class="text-cyan-500" />
					<span>Snippets</span>
				</div>
				<div class="text-xs text-muted">代码片段资料库 · 分组、搜索、与 Task/Project 弱关联</div>
			</div>

			<div class="flex items-center gap-2">
				<UInput
					v-model="searchKeyword"
					icon="i-lucide-search"
					placeholder="搜索标题、标签、内容…"
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
							<span>所有片段</span>
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

			<!-- 中间：代码片段列表 -->
			<main class="flex-1 min-w-0 overflow-y-auto">
				<div
					v-if="filteredSnippets.length === 0 && !loading"
					class="text-sm text-muted py-8 text-center">
					暂无代码片段。点击「新建」创建第一个片段。
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="s in filteredSnippets"
						:key="s.id"
						class="p-3 rounded-lg border border-default bg-elevated/80 cursor-pointer hover:bg-default transition"
						:class="selectedSnippet?.id === s.id ? 'ring-2 ring-primary' : ''"
						@click="selectSnippet(s)">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-sm font-medium truncate">{{ s.title }}</span>
									<UBadge
										color="neutral"
										variant="soft"
										size="2xs">
										{{ s.language }}
									</UBadge>
									<UBadge
										v-if="s.folder"
										color="primary"
										variant="soft"
										size="2xs">
										{{ s.folder }}
									</UBadge>
								</div>
								<div class="text-xs text-muted line-clamp-2 mb-1.5">
									{{ s.content.substring(0, 100) }}{{ s.content.length > 100 ? '...' : '' }}
								</div>
								<div class="flex items-center gap-2 flex-wrap">
									<UBadge
										v-for="tag in s.tags.slice(0, 3)"
										:key="tag"
										color="neutral"
										variant="subtle"
										size="2xs">
										{{ tag }}
									</UBadge>
									<span
										v-if="s.tags.length > 3"
										class="text-[10px] text-muted">
										+{{ s.tags.length - 3 }}
									</span>
								</div>
							</div>
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								icon="i-lucide-trash-2"
								@click.stop="onDelete(s.id)">
								<span class="sr-only">删除</span>
							</UButton>
						</div>
					</div>
				</div>
			</main>

			<!-- 右侧：编辑区 -->
			<aside
				v-if="selectedSnippet"
				class="w-96 shrink-0 border-l border-default pl-4 overflow-y-auto">
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-semibold">编辑片段</span>
						<UButton
							color="neutral"
							variant="ghost"
							size="2xs"
							icon="i-lucide-x"
							@click="selectedSnippet = null">
							<span class="sr-only">关闭</span>
						</UButton>
					</div>

					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">标题</label>
						<UInput
							v-model="editForm.title"
							placeholder="代码片段标题"
							size="sm" />
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div class="space-y-2">
							<label class="text-[11px] font-medium text-muted uppercase tracking-wide">语言</label>
							<UInput
								v-model="editForm.language"
								placeholder="如: javascript"
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
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">内容</label>
						<UTextarea
							v-model="editForm.content"
							placeholder="输入代码或 Markdown 内容…"
							:rows="12"
							autoresize />
					</div>

					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">标签（逗号分隔）</label>
						<UInput
							v-model="tagsInput"
							placeholder="tag1, tag2, tag3"
							size="sm"
							@blur="onTagsBlur" />
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
							@click="selectedSnippet = null">
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

	import type { SnippetDto } from '@/services/api/snippets'
	import { createSnippet, deleteSnippet, listSnippets, updateSnippet } from '@/services/api/snippets'

	const toast = useToast()

	const loading = ref(false)
	const snippets = ref<SnippetDto[]>([])
	const selectedSnippet = ref<SnippetDto | null>(null)
	const selectedFolder = ref<string | null>(null)
	const searchKeyword = ref('')

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
		for (const s of snippets.value) {
			if (s.folder) set.add(s.folder)
		}
		return Array.from(set).sort()
	})

	const filteredSnippets = computed(() => {
		let result = snippets.value

		if (selectedFolder.value !== null) {
			result = result.filter((s) => s.folder === selectedFolder.value)
		}

		if (searchKeyword.value.trim()) {
			const kw = searchKeyword.value.trim().toLowerCase()
			result = result.filter((s) => {
				if (s.title.toLowerCase().includes(kw)) return true
				if (s.content.toLowerCase().includes(kw)) return true
				if (s.tags.some((t) => t.toLowerCase().includes(kw))) return true
				return false
			})
		}

		return result.sort((a, b) => b.updated_at - a.updated_at)
	})

	function selectSnippet(s: SnippetDto) {
		selectedSnippet.value = s
		editForm.value = {
			title: s.title,
			language: s.language,
			content: s.content,
			folder: s.folder,
			tags: [...s.tags],
		}
		tagsInput.value = s.tags.join(', ')
	}

	function onCreateNew() {
		const newSnippet: SnippetDto = {
			id: '',
			title: '',
			language: 'plaintext',
			content: '',
			folder: null,
			tags: [],
			linked_task_id: null,
			linked_project_id: null,
			created_at: Date.now(),
			updated_at: Date.now(),
		}
		selectSnippet(newSnippet)
	}

	function onTagsBlur() {
		editForm.value.tags = tagsInput.value
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)
	}

	async function onSave() {
		if (!selectedSnippet.value) return
		if (!editForm.value.title.trim()) {
			toast.add({ title: '标题不能为空', color: 'error' })
			return
		}

		try {
			onTagsBlur()
			if (selectedSnippet.value.id) {
				await updateSnippet(selectedSnippet.value.id, editForm.value)
				toast.add({ title: '已保存', color: 'success' })
			} else {
				await createSnippet(editForm.value)
				toast.add({ title: '已创建', color: 'success' })
			}
			await refresh()
			selectedSnippet.value = null
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
			await deleteSnippet(id)
			toast.add({ title: '已删除', color: 'success' })
			if (selectedSnippet.value?.id === id) {
				selectedSnippet.value = null
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
			snippets.value = await listSnippets()
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
