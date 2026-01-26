<template>
	<USlideover
		v-if="currentTask"
		v-model:open="isOpen"
		side="right"
		:ui="{
			content: 'w-[360px] sm:w-[400px] h-full flex flex-col bg-default/90 backdrop-blur-xl border-l border-default z-50',
			wrapper: 'z-50',
		}"
		:close="false">
		<template #content>
			<div class="flex flex-col h-full">
				<!-- Header -->
				<header class="px-4 py-3.5 border-b border-default/80 flex items-center justify-between gap-3 shrink-0">
					<div class="flex items-center gap-2.5 min-w-0 flex-1">
						<UBadge
							size="xs"
							color="primary"
							variant="soft">
							{{ currentSpaceLabel }}
						</UBadge>
						<div class="flex items-center gap-1.5 text-xs text-muted min-w-0">
							<UIcon
								name="i-lucide-folder"
								class="size-3.5 shrink-0" />
							<span class="truncate">
								{{ projectPath }}
							</span>
						</div>
					</div>

					<div class="flex items-center gap-1 shrink-0">
						<USelectMenu
							v-model="statusLocal"
							:items="statusOptionsArray"
							value-key="value"
							label-key="label"
							size="xs"
							color="primary"
							variant="soft"
							@update:model-value="onStatusChange" />

						<UButton
							color="neutral"
							variant="ghost"
							icon="i-lucide-more-horizontal"
							size="xs" />

						<UButton
							color="neutral"
							variant="ghost"
							icon="i-lucide-x"
							size="xs"
							@click="close">
							<span class="sr-only">关闭</span>
						</UButton>
					</div>
				</header>

				<!-- Body -->
				<div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
					<!-- 标题 -->
					<section class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">标题</label>
						<UTextarea
							v-model="titleLocal"
							placeholder="输入任务标题…"
							autoresize
							:maxrows="3"
							size="sm"
							:ui="{
								rounded: 'rounded-xl',
							}"
							@blur="onTitleBlur" />
					</section>

					<!-- 属性 -->
					<section class="space-y-2.5">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">属性</label>
						<div class="grid grid-cols-2 gap-2.5">
							<!-- Priority -->
							<UPopover>
								<button
									type="button"
									class="p-3 rounded-xl bg-elevated/50 border border-default/50 hover:bg-elevated/70 hover:border-default/70 transition-all text-left w-full">
									<div class="flex items-center gap-2.5">
										<UIcon
											name="i-lucide-flag"
											class="size-4 text-amber-400 shrink-0" />
										<div class="min-w-0 flex-1">
											<div class="text-[11px] text-muted mb-1">Priority</div>
											<div class="text-xs font-medium text-default">
												{{ priorityLabel }}
											</div>
										</div>
									</div>
								</button>
								<template #content>
									<div class="p-2 min-w-[200px]">
										<div
											v-for="opt in priorityOptions"
											:key="opt.value"
											class="px-3 py-2 rounded-lg hover:bg-elevated cursor-pointer transition-colors"
											:class="{
												'bg-elevated': priorityLocal === opt.value,
											}"
											@click="onPriorityChange(opt.value)">
											<div class="flex items-center gap-2">
												<UIcon
													:name="opt.icon"
													class="size-4 shrink-0"
													:class="opt.iconClass" />
												<span class="text-sm">{{ opt.label }}</span>
											</div>
										</div>
									</div>
								</template>
							</UPopover>

							<!-- Planned Start Date -->
							<UPopover>
								<button
									type="button"
									class="p-3 rounded-xl bg-elevated/50 border border-default/50 hover:bg-elevated/70 hover:border-default/70 transition-all text-left w-full">
									<div class="flex items-center gap-2.5">
										<UIcon
											name="i-lucide-calendar-days"
											class="size-4 text-emerald-400 shrink-0" />
										<div class="min-w-0 flex-1">
											<div class="text-[11px] text-muted mb-1">开始时间</div>
											<div class="text-xs font-medium text-default">
												{{ plannedStartDateLabel }}
											</div>
										</div>
									</div>
								</button>
								<template #content>
									<div class="p-2">
										<UInput
											v-model="plannedStartDateLocal"
											type="date"
											size="sm"
											:ui="{ rounded: 'rounded-lg' }"
											@update:model-value="onPlannedStartDateChange" />
										<div class="mt-2 flex gap-2">
											<UButton
												color="neutral"
												variant="ghost"
												size="xs"
												@click="onPlannedStartDateClear">
												清除
											</UButton>
										</div>
									</div>
								</template>
							</UPopover>

							<!-- Planned End Date -->
							<UPopover>
								<button
									type="button"
									class="p-3 rounded-xl bg-elevated/50 border border-default/50 hover:bg-elevated/70 hover:border-default/70 transition-all text-left w-full">
									<div class="flex items-center gap-2.5">
										<UIcon
											name="i-lucide-calendar"
											class="size-4 text-sky-400 shrink-0" />
										<div class="min-w-0 flex-1">
											<div class="text-[11px] text-muted mb-1">结束时间</div>
											<div class="text-xs font-medium text-default">
												{{ plannedEndDateLabel }}
											</div>
										</div>
									</div>
								</button>
								<template #content>
									<div class="p-2">
										<UInput
											v-model="plannedEndDateLocal"
											type="date"
											size="sm"
											:ui="{ rounded: 'rounded-lg' }"
											@update:model-value="onPlannedEndDateChange" />
										<div class="mt-2 flex gap-2">
											<UButton
												color="neutral"
												variant="ghost"
												size="xs"
												@click="onPlannedEndDateClear">
												清除
											</UButton>
										</div>
									</div>
								</template>
							</UPopover>

							<!-- Tags -->
							<UPopover>
								<button
									type="button"
									class="p-3 rounded-xl bg-elevated/50 border border-default/50 hover:bg-elevated/70 hover:border-default/70 transition-all text-left col-span-2">
									<div class="space-y-2">
										<div class="text-[11px] text-muted">Tags</div>
										<div
											v-if="tagsLocal.length > 0"
											class="flex flex-wrap gap-1.5">
											<UBadge
												v-for="tag in tagsLocal"
												:key="tag"
												color="neutral"
												variant="soft"
												size="xs">
												#{{ tag }}
											</UBadge>
										</div>
										<div
											v-else
											class="text-xs text-muted">
											暂无标签
										</div>
									</div>
								</button>
								<template #content>
									<div class="p-3 min-w-[280px] space-y-3">
										<div class="flex flex-wrap gap-1.5">
											<UBadge
												v-for="tag in tagsLocal"
												:key="tag"
												color="neutral"
												variant="soft"
												size="sm"
												class="cursor-pointer"
												@click="removeTag(tag)">
												#{{ tag }}
												<template #trailing>
													<UIcon
														name="i-lucide-x"
														class="size-3 ml-1" />
												</template>
											</UBadge>
										</div>
										<UInput
											v-model="tagInput"
											placeholder="输入标签后按回车添加"
											size="sm"
											:ui="{ rounded: 'rounded-lg' }"
											@keydown.enter.prevent="addTag" />
									</div>
								</template>
							</UPopover>
						</div>
					</section>

					<!-- 备注 -->
					<section class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">备注</label>
						<UTextarea
							v-model="noteLocal"
							placeholder="记录一些背景信息、想法或链接…"
							:rows="4"
							size="sm"
							autoresize
							:ui="{
								rounded: 'rounded-xl',
							}"
							@blur="onNoteBlur" />
					</section>

					<!-- 时间线 -->
					<section class="space-y-2.5">
						<div class="flex items-center justify-between">
							<label class="text-[11px] font-medium text-muted uppercase tracking-wide">时间线</label>
							<UBadge
								size="xs"
								color="neutral"
								variant="soft">
								mock 数据
							</UBadge>
						</div>
						<UTimeline :items="timelineItems" />
					</section>
				</div>
			</div>
		</template>
	</USlideover>
</template>

<script setup lang="ts">
	import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

	import { updateTask } from '@/services/api/tasks'
	import { useProjectsStore } from '@/stores/projects'
	import { useTaskInspectorStore } from '@/stores/taskInspector'
	import {
		statusOptions,
		getDisplayStatus,
		mapDisplayStatusToBackend,
	} from '@/utils/task'

	const statusOptionsArray = [...statusOptions]

	const store = useTaskInspectorStore()
	const projectsStore = useProjectsStore()

	const currentTask = computed(() => store.task)

	const titleLocal = ref('')
	const statusLocal = ref<'todo' | 'doing' | 'done'>('todo')
	const priorityLocal = ref<string>('P1')
	const plannedStartDateLocal = ref<string>('')
	const plannedEndDateLocal = ref<string>('')
	const noteLocal = ref<string>('')
	const tagsLocal = ref<string[]>([])
	const tagInput = ref('')

	const priorityOptions = [
		{
			value: 'P0',
			label: 'P0 - 紧急',
			icon: 'i-lucide-alert-circle',
			iconClass: 'text-red-500',
		},
		{
			value: 'P1',
			label: 'P1 - 高',
			icon: 'i-lucide-flag',
			iconClass: 'text-amber-500',
		},
		{
			value: 'P2',
			label: 'P2 - 中',
			icon: 'i-lucide-flag',
			iconClass: 'text-blue-500',
		},
		{
			value: 'P3',
			label: 'P3 - 低',
			icon: 'i-lucide-flag',
			iconClass: 'text-muted',
		},
	]

	const priorityLabel = computed(() => {
		const opt = priorityOptions.find((p) => p.value === priorityLocal.value)
		return opt ? opt.label : '未设定'
	})

	const plannedStartDateLabel = computed(() => {
		if (!plannedStartDateLocal.value) return '未设定'
		const date = new Date(plannedStartDateLocal.value)
		return date.toLocaleDateString('zh-CN', {
			month: 'short',
			day: 'numeric',
		})
	})

	const plannedEndDateLabel = computed(() => {
		if (!plannedEndDateLocal.value) return '未设定'
		const date = new Date(plannedEndDateLocal.value)
		return date.toLocaleDateString('zh-CN', {
			month: 'short',
			day: 'numeric',
		})
	})

	const currentSpaceLabel = computed(() => {
		const sid = currentTask.value?.space_id
		if (!sid) return 'Unknown Space'
		const map: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		return map[sid] ?? sid
	})

	const projectPath = computed(() => {
		const task = currentTask.value
		if (!task?.project_id) return '未分类'
		const projects = projectsStore.getProjectsOfSpace(task.space_id)
		const project = projects.find((p) => p.id === task.project_id)
		if (!project) return '未知项目'
		// 使用 path 字段，格式类似 "/与光/Pro/可灵2.6"
		return project.path || project.name
	})

	const timelineItems = computed(() => {
		const t = currentTask.value
		if (!t) return []

		const created = new Date(t.created_at)
		const started = t.started_at ? new Date(t.started_at) : null
		const completed = t.completed_at ? new Date(t.completed_at) : null

		const items = [
			{
				label: '创建',
				content: created.toLocaleString(),
				icon: 'i-lucide-circle-dot',
			},
		]

		if (started) {
			items.push({
				label: '开始',
				content: started.toLocaleString(),
				icon: 'i-lucide-play',
			})
		}

		if (completed) {
			items.push({
				label: '完成',
				content: completed.toLocaleString(),
				icon: 'i-lucide-check-circle-2',
			})
		}

		return items
	})

	const isOpen = computed({
		get: () => store.isOpen as boolean,
		set: (value) => {
			if (!value) {
				store.close()
			}
		},
	})

	function close() {
		store.close()
	}

	async function onTitleBlur() {
		if (!currentTask.value) return
		const nextTitle = titleLocal.value.trim()
		if (!nextTitle || nextTitle === currentTask.value.title) return
		await updateTask(currentTask.value.id, { title: nextTitle })
		store.patchTask({ title: nextTitle })
	}

	async function onStatusChange(value: unknown) {
		const record = value as { value?: string } | null
		const displayStatus = (typeof value === 'string' ? value : record?.value) as
			| 'todo'
			| 'doing'
			| 'done'
			| undefined
		if (!currentTask.value || !displayStatus) return

		// 映射显示状态到后端状态
		const backendStatus = mapDisplayStatusToBackend(displayStatus, currentTask.value.status)
		if (backendStatus === currentTask.value.status) return

		await updateTask(currentTask.value.id, { status: backendStatus })
		store.patchTask({ status: backendStatus })
		statusLocal.value = displayStatus
	}

	async function onPriorityChange(value: string) {
		if (!currentTask.value || value === priorityLocal.value) return
		await updateTask(currentTask.value.id, { priority: value })
		store.patchTask({ priority: value })
		priorityLocal.value = value
	}

	async function onPlannedStartDateChange() {
		if (!currentTask.value) return
		let plannedStartAt: number | null = null
		if (plannedStartDateLocal.value) {
			const date = new Date(plannedStartDateLocal.value)
			date.setHours(0, 0, 0, 0)
			plannedStartAt = date.getTime()
		}
		await updateTask(currentTask.value.id, { plannedStartAt })
		store.patchTask({ planned_start_at: plannedStartAt })
	}

	async function onPlannedStartDateClear() {
		plannedStartDateLocal.value = ''
		if (!currentTask.value) return
		await updateTask(currentTask.value.id, { plannedStartAt: null })
		store.patchTask({ planned_start_at: null })
	}

	async function onPlannedEndDateChange() {
		if (!currentTask.value) return
		let plannedEndAt: number | null = null
		if (plannedEndDateLocal.value) {
			const date = new Date(plannedEndDateLocal.value)
			date.setHours(23, 59, 59, 999)
			plannedEndAt = date.getTime()
		}
		await updateTask(currentTask.value.id, { plannedEndAt })
		store.patchTask({ planned_end_at: plannedEndAt })
	}

	async function onPlannedEndDateClear() {
		plannedEndDateLocal.value = ''
		if (!currentTask.value) return
		await updateTask(currentTask.value.id, { plannedEndAt: null })
		store.patchTask({ planned_end_at: null })
	}

	function addTag() {
		const tag = tagInput.value.trim()
		if (tag && !tagsLocal.value.includes(tag)) {
			tagsLocal.value.push(tag)
			tagInput.value = ''
			onTagsChange()
		}
	}

	function removeTag(tag: string) {
		tagsLocal.value = tagsLocal.value.filter((t) => t !== tag)
		onTagsChange()
	}

	async function onTagsChange() {
		if (!currentTask.value) return
		await updateTask(currentTask.value.id, { tags: tagsLocal.value })
		store.patchTask({ tags: tagsLocal.value })
	}

	async function onNoteBlur() {
		if (!currentTask.value) return
		const nextNote = noteLocal.value.trim() || null
		if (nextNote === (currentTask.value.note || null)) return
		await updateTask(currentTask.value.id, { note: nextNote })
		store.patchTask({ note: nextNote })
	}

	function syncFromTask() {
		const t = currentTask.value
		if (!t) return
		titleLocal.value = t.title
		// 将后端状态映射到显示状态
		statusLocal.value = getDisplayStatus(t.status)
		priorityLocal.value = t.priority || 'P1'
		noteLocal.value = t.note || ''
		tagsLocal.value = t.tags || []
		tagInput.value = ''

		// 处理计划开始时间
		if (t.planned_start_at) {
			const date = new Date(t.planned_start_at)
			plannedStartDateLocal.value = date.toISOString().split('T')[0]
		} else {
			plannedStartDateLocal.value = ''
		}

		// 处理计划结束时间
		if (t.planned_end_at) {
			const date = new Date(t.planned_end_at)
			plannedEndDateLocal.value = date.toISOString().split('T')[0]
		} else {
			plannedEndDateLocal.value = ''
		}
	}

	watch(
		() => currentTask.value,
		async (task) => {
			if (task) {
				// 确保项目数据已加载
				await projectsStore.loadForSpace(task.space_id)
				syncFromTask()
			}
		},
		{ immediate: true },
	)

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen.value) {
			e.preventDefault()
			close()
		}
	}

	onMounted(() => {
		window.addEventListener('keydown', onKeydown)
	})

	onUnmounted(() => {
		window.removeEventListener('keydown', onKeydown)
	})
</script>
