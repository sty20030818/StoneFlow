<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 新建 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-default">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-book-open-text"
						class="text-indigo-500" />
					<span>Diary</span>
				</div>
				<div class="text-xs text-muted">工作日志 · 时间序列日记 · 与 Finish List 联动</div>
			</div>

			<UButton
				color="primary"
				size="sm"
				icon="i-lucide-plus"
				@click="onCreateNew">
				新建日记
			</UButton>
		</header>

		<!-- 主体：时间序列列表 -->
		<main
			v-motion="timelineMotion"
			class="flex-1 min-h-0 overflow-y-auto mt-4">
			<div
				v-if="groupedEntries.length === 0 && !loading"
				class="text-sm text-muted py-8 text-center">
				暂无日记条目。点击「新建日记」创建第一篇日记。
			</div>

			<div
				v-else
				class="space-y-6">
				<div
					v-for="group in groupedEntries"
					:key="group.date">
					<div class="flex items-center gap-3 mb-3">
						<div class="text-sm font-semibold">{{ group.dateLabel }}</div>
						<div class="flex-1 border-t border-default" />
						<UBadge
							color="neutral"
							variant="soft"
							size="xs">
							{{ group.entries.length }} 篇
						</UBadge>
					</div>

					<div class="space-y-3">
						<UCard
							v-for="(e, index) in group.entries"
							:key="e.id"
							v-motion="getDiaryItemMotion(index)"
							class="cursor-pointer hover:bg-default transition"
							@click="selectEntry(e)">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2 mb-1.5">
										<span class="text-sm font-medium">{{ e.title || '无标题' }}</span>
										<UBadge
											v-if="e.linkedProjectId"
											color="primary"
											variant="soft"
											size="2xs">
											Project
										</UBadge>
										<UBadge
											v-if="e.linkedTaskIds.length > 0"
											color="success"
											variant="soft"
											size="2xs">
											{{ e.linkedTaskIds.length }} Tasks
										</UBadge>
									</div>
									<div class="text-xs text-muted line-clamp-3 mb-2">
										{{ e.content }}
									</div>
									<div
										v-if="group.tasks.length > 0"
										class="mt-2 pt-2 border-t border-default/60">
										<div class="text-[11px] text-muted mb-1">当天完成的任务：</div>
										<div class="flex flex-wrap gap-1.5">
											<UBadge
												v-for="t in group.tasks"
												:key="t.id"
												color="success"
												variant="subtle"
												size="2xs"
												class="cursor-pointer"
												@click.stop="goToFinishList">
												{{ t.title }}
											</UBadge>
										</div>
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
						</UCard>
					</div>
				</div>
			</div>
		</main>

		<!-- 编辑模态框 -->
		<UModal
			v-model="editOpen"
			title="日记编辑"
			description="创建或编辑日记内容"
			:ui="diaryModalUi">
			<div
				v-motion="modalBodyMotion"
				class="p-4 space-y-3">
				<header class="space-y-1">
					<div class="flex items-center gap-2">
						<UIcon
							name="i-lucide-book-open-text"
							class="size-4 text-indigo-500" />
						<h2 class="text-sm font-semibold">{{ selectedEntry ? '编辑日记' : '新建日记' }}</h2>
					</div>
				</header>

				<div class="grid grid-cols-2 gap-2">
					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">日期</label>
						<UInput
							v-model="editForm.date"
							type="date"
							size="sm" />
					</div>
					<div class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">标题</label>
						<UInput
							v-model="editForm.title"
							placeholder="日记标题"
							size="sm" />
					</div>
				</div>

				<div class="space-y-2">
					<label class="text-[11px] font-medium text-muted uppercase tracking-wide">内容（Markdown）</label>
					<UTextarea
						v-model="editForm.content"
						placeholder="记录感想、灵感、总结…"
						:rows="10"
						autoresize />
				</div>

				<div class="space-y-2">
					<label class="text-[11px] font-medium text-muted uppercase tracking-wide">关联 Project ID（可选）</label>
					<UInput
						v-model="editForm.linkedProjectId"
						placeholder="project:xxx"
						size="sm" />
				</div>

				<div
					v-motion="modalFooterMotion"
					class="flex items-center gap-2 pt-2">
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
						@click="editOpen = false">
						取消
					</UButton>
				</div>
			</div>
		</UModal>
	</section>
</template>

<script setup lang="ts">
	import { useAsyncState } from '@vueuse/core'
	import { computed, ref } from 'vue'
	import { useRouter } from 'vue-router'

	import { getAppStaggerDelay, useAppMotionPreset, useMotionPreset, useMotionPresetWithDelay, withMotionDelay } from '@/composables/base/motion'
	import { validateWithZod } from '@/composables/base/zod'
	import { diarySubmitSchema } from '@/composables/domain/validation/forms'
	import { createModalLayerUi } from '@/config/ui-layer'
	import { listTasks, type TaskDto } from '@/services/api/tasks'
	import type { DiaryEntryDto } from '@/services/api/diary'
	import { createDiaryEntry, deleteDiaryEntry, listDiaryEntries, updateDiaryEntry } from '@/services/api/diary'

	const toast = useToast()
	const router = useRouter()
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const timelineMotion = useAppMotionPreset('drawerSection', 'sectionBase', 20)
	const diaryItemPreset = useMotionPreset('card')
	const modalBodyMotion = useMotionPresetWithDelay('modalSection', 24)
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 44)
	const diaryModalUi = createModalLayerUi({
		width: 'sm:max-w-2xl',
	})

	const entries = ref<DiaryEntryDto[]>([])
	const tasks = ref<TaskDto[]>([])
	const selectedEntry = ref<DiaryEntryDto | null>(null)
	const editOpen = ref(false)
	const { isLoading: loading, execute: executeRefresh } = useAsyncState(
		async () => {
			const [diaryEntries, doneTasks] = await Promise.all([listDiaryEntries(), listTasks({ status: 'done' })])
			return {
				entries: diaryEntries,
				tasks: doneTasks.filter((t) => t.doneReason !== 'cancelled'),
			}
		},
		{
			entries: [] as DiaryEntryDto[],
			tasks: [] as TaskDto[],
		},
		{
			immediate: true,
			resetOnExecute: false,
			onSuccess: ({ entries: nextEntries, tasks: nextTasks }) => {
				entries.value = nextEntries
				tasks.value = nextTasks
			},
			onError: (e) => {
				toast.add({
					title: '加载失败',
					description: e instanceof Error ? e.message : '未知错误',
					color: 'error',
				})
			},
		},
	)

	const editForm = ref({
		date: new Date().toISOString().split('T')[0],
		title: '',
		content: '',
		linkedTaskIds: [] as string[],
		linkedProjectId: null as string | null,
	})

	type GroupedEntry = {
		date: string
		dateLabel: string
		entries: DiaryEntryDto[]
		tasks: TaskDto[]
	}

	const groupedEntries = computed<GroupedEntry[]>(() => {
		const byDate = new Map<string, DiaryEntryDto[]>()

		for (const e of entries.value) {
			const arr = byDate.get(e.date) ?? []
			arr.push(e)
			byDate.set(e.date, arr)
		}

		const result: GroupedEntry[] = []
		for (const [date, entriesList] of byDate.entries()) {
			const d = new Date(date)
			const dateLabel = d.toLocaleDateString('zh-CN', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				weekday: 'long',
			})

			const dayTasks = tasks.value.filter((t) => {
				if (!t.completedAt) return false
				const taskDate = new Date(t.completedAt).toISOString().split('T')[0]
				return taskDate === date
			})

			result.push({
				date,
				dateLabel,
				entries: entriesList.sort((a, b) => b.createdAt - a.createdAt),
				tasks: dayTasks,
			})
		}

		return result.sort((a, b) => b.date.localeCompare(a.date))
	})
	function getDiaryItemMotion(index: number) {
		return withMotionDelay(diaryItemPreset.value, getAppStaggerDelay(index))
	}

	function selectEntry(e: DiaryEntryDto) {
		selectedEntry.value = e
		editForm.value = {
			date: e.date,
			title: e.title,
			content: e.content,
			linkedTaskIds: [...e.linkedTaskIds],
			linkedProjectId: e.linkedProjectId,
		}
		editOpen.value = true
	}

	function onCreateNew() {
		selectedEntry.value = null
		editForm.value = {
			date: new Date().toISOString().split('T')[0],
			title: '',
			content: '',
			linkedTaskIds: [],
			linkedProjectId: null,
		}
		editOpen.value = true
	}

	async function onSave() {
		const validation = validateWithZod(diarySubmitSchema, { title: editForm.value.title })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}

		try {
			if (selectedEntry.value) {
				await updateDiaryEntry(selectedEntry.value.id, editForm.value)
				toast.add({ title: '已保存', color: 'success' })
			} else {
				await createDiaryEntry(editForm.value)
				toast.add({ title: '已创建', color: 'success' })
			}
			await refresh()
			editOpen.value = false
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
			await deleteDiaryEntry(id)
			toast.add({ title: '已删除', color: 'success' })
			await refresh()
		} catch (e) {
			toast.add({
				title: '删除失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	function goToFinishList() {
		router.push({ path: '/finish-list' })
	}

	async function refresh() {
		await executeRefresh(0)
	}
</script>
