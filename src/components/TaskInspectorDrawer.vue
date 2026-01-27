<template>
	<USlideover
		v-if="currentTask"
		v-model:open="isOpen"
		side="right"
		:ui="{
			content: 'w-[560px] h-full flex flex-col bg-default/90 backdrop-blur-2xl border-l border-default z-50',
			wrapper: 'z-50',
		}"
		:close="false">
		<template #content>
			<div class="flex flex-col h-full">
				<!-- Header -->
				<header class="px-5 py-4 border-b border-default/80 flex items-center justify-between gap-3 shrink-0">
					<div class="flex items-center gap-1.5 min-w-0 flex-1 leading-tight">
						<span
							class="px-2.5 py-1 rounded-full text-[12px] font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
							:class="spacePillClass">
							<UIcon
								:name="currentSpaceIcon"
								class="size-3.5 shrink-0 text-white" />
							<span>{{ currentSpaceLabel }}</span>
						</span>

						<template v-if="projectTrail.length">
							<template
								v-for="(item, index) in projectTrail"
								:key="`${item}-${index}`">
								<span class="text-muted/70 text-[12px] shrink-0">/</span>
								<span
									v-if="index < projectTrail.length - 1"
									class="text-[12px] font-medium text-muted/80 shrink-0 truncate max-w-[140px]">
									{{ item }}
								</span>
								<span
									v-else
									class="text-[14px] font-extrabold text-default truncate min-w-0 flex-1">
									{{ item }}
								</span>
							</template>
						</template>
					</div>

					<div class="flex items-center gap-2 shrink-0">
						<div
							v-if="saveState !== 'idle'"
							class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all"
							:class="saveStateClass">
							<span
								class="size-1.5 rounded-full"
								:class="saveStateDotClass"></span>
							<span>{{ saveStateLabel }}</span>
						</div>
						<div class="h-4 w-px bg-default/70"></div>

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
				<div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
					<!-- 状态切换 -->
					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">状态</label>
						<div class="flex items-center gap-2.5">
							<div class="rounded-full bg-elevated/70 border border-default/80 p-1 flex gap-1 flex-1">
								<button
									v-for="opt in statusSegmentOptions"
									:key="opt.value"
									type="button"
									class="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:shadow-sm active:translate-y-[1px]"
									:class="
										statusLocal === opt.value ? opt.activeClass : 'text-muted hover:text-default hover:bg-default/40'
									"
									@click="onStatusSegmentClick(opt.value)">
									<UIcon
										:name="opt.icon"
										class="size-3.5"
										:class="statusLocal === opt.value ? opt.iconClass : 'text-muted'" />
									<span>{{ opt.label }}</span>
								</button>
							</div>
							<UBadge
								v-if="statusSubLabel"
								size="xs"
								color="neutral"
								variant="soft">
								{{ statusSubLabel }}
							</UBadge>
						</div>
					</section>

					<!-- 标题 -->
					<section class="space-y-2">
						<UInput
							v-model="titleLocal"
							placeholder="任务标题..."
							size="xl"
							variant="none"
							:ui="{
								root: 'w-full',
								base: 'px-0 py-0 text-2xl font-semibold leading-tight bg-transparent border-none focus:ring-0 placeholder:text-muted/40',
							}"
							@blur="onTitleBlur" />
					</section>

					<!-- 属性 -->
					<section class="space-y-3">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">属性</label>
						<div class="grid grid-cols-2 gap-3">
							<!-- Priority -->
							<UPopover>
								<button
									type="button"
									class="p-3.5 rounded-2xl bg-elevated/50 border border-default/60 hover:bg-elevated/80 hover:border-default/80 transition-all text-left w-full">
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
									class="p-3.5 rounded-2xl bg-elevated/50 border border-default/60 hover:bg-elevated/80 hover:border-default/80 transition-all text-left w-full">
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
									class="p-3.5 rounded-2xl bg-elevated/50 border border-default/60 hover:bg-elevated/80 hover:border-default/80 transition-all text-left w-full">
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
									class="p-3.5 rounded-2xl bg-elevated/50 border border-default/60 hover:bg-elevated/80 hover:border-default/80 transition-all text-left col-span-2">
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
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Note</label>
						<UTextarea
							v-model="noteLocal"
							placeholder="记录一些背景信息、想法或链接…"
							:rows="6"
							size="sm"
							autoresize
							variant="none"
							:ui="{
								root: 'w-full',
								base: 'min-h-[160px] px-4 py-3 text-sm leading-relaxed rounded-2xl bg-elevated/40 border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/10 placeholder:text-muted/40',
							}"
							@blur="onNoteBlur" />
					</section>

					<!-- 时间线 -->
					<section class="space-y-3">
						<button
							type="button"
							class="flex items-center justify-between w-full"
							@click="toggleTimeline">
							<div class="flex items-center gap-2">
								<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">时间线</label>
								<UBadge
									size="xs"
									color="neutral"
									variant="soft">
									{{ timelineItems.length }}
								</UBadge>
							</div>
							<UIcon
								name="i-lucide-chevron-down"
								class="size-4 text-muted transition-transform duration-200"
								:class="timelineCollapsed ? '' : 'rotate-180'" />
						</button>
						<div v-show="!timelineCollapsed">
							<UTimeline :items="timelineItems" />
						</div>
					</section>
				</div>
			</div>
		</template>
	</USlideover>
</template>

<script setup lang="ts">
	import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

	import { updateTask, type TaskDto, type UpdateTaskPatch } from '@/services/api/tasks'
	import { useProjectsStore } from '@/stores/projects'
	import { useTaskInspectorStore } from '@/stores/taskInspector'
	import { getDisplayStatus, mapDisplayStatusToBackend, isPaused, isAbandoned } from '@/utils/task'

	const statusSegmentOptions = [
		{
			value: 'todo',
			label: '待办',
			icon: 'i-lucide-list-todo',
			iconClass: 'text-orange-500',
			activeClass: 'bg-orange-50 text-orange-700 shadow-sm',
		},
		{
			value: 'doing',
			label: '进行中',
			icon: 'i-lucide-loader',
			iconClass: 'text-blue-500',
			activeClass: 'bg-blue-50 text-blue-700 shadow-sm',
		},
		{
			value: 'done',
			label: '已完成',
			icon: 'i-lucide-check-circle',
			iconClass: 'text-emerald-500',
			activeClass: 'bg-emerald-50 text-emerald-700 shadow-sm',
		},
	] as const

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
	const timelineCollapsed = ref(true)
	const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
	const pendingSaves = ref(0)
	let saveStateTimer: ReturnType<typeof setTimeout> | null = null

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

	const currentSpaceIcon = computed(() => {
		const sid = currentTask.value?.space_id
		if (!sid) return 'i-lucide-folder'
		const map: Record<string, string> = {
			work: 'i-lucide-briefcase',
			personal: 'i-lucide-user',
			study: 'i-lucide-book-open',
		}
		return map[sid] ?? 'i-lucide-folder'
	})

	const spacePillClass = computed(() => {
		const sid = currentTask.value?.space_id
		if (sid === 'work') return 'bg-blue-500'
		if (sid === 'personal') return 'bg-purple-500'
		if (sid === 'study') return 'bg-emerald-500'
		return 'bg-slate-500'
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

	const projectTrail = computed(() => {
		const raw = projectPath.value?.trim()
		if (!raw) return []
		if (raw === '未分类' || raw === '未知项目') return [raw]
		const parts = raw
			.split('/')
			.map((item) => item.trim())
			.filter(Boolean)
		return parts.length ? parts : [raw]
	})

	const levelPalette = ['bg-amber-500', 'bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500']

	const projectPillClass = (index: number) => levelPalette[index % levelPalette.length]

	const statusSubLabel = computed(() => {
		const status = currentTask.value?.status
		if (!status) return null
		if (isPaused(status)) return '已暂停'
		if (isAbandoned(status)) return '已放弃'
		return null
	})

	const saveStateLabel = computed(() => {
		if (saveState.value === 'saving') return '保存中'
		if (saveState.value === 'saved') return '已保存'
		if (saveState.value === 'error') return '保存失败'
		return ''
	})

	const saveStateClass = computed(() => {
		if (saveState.value === 'saving') return 'text-blue-500'
		if (saveState.value === 'saved') return 'text-emerald-500'
		if (saveState.value === 'error') return 'text-rose-500'
		return 'text-muted'
	})

	const saveStateDotClass = computed(() => {
		if (saveState.value === 'saving') return 'bg-blue-500 animate-pulse'
		if (saveState.value === 'saved') return 'bg-emerald-500'
		if (saveState.value === 'error') return 'bg-rose-500'
		return 'bg-muted'
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

	function clearSaveStateTimer() {
		if (saveStateTimer) {
			clearTimeout(saveStateTimer)
			saveStateTimer = null
		}
	}

	function beginSave() {
		pendingSaves.value += 1
		saveState.value = 'saving'
		clearSaveStateTimer()
	}

	function endSave(ok: boolean) {
		pendingSaves.value = Math.max(0, pendingSaves.value - 1)
		if (pendingSaves.value > 0) return
		clearSaveStateTimer()
		if (ok) {
			saveState.value = 'saved'
			saveStateTimer = setTimeout(() => {
				saveState.value = 'idle'
			}, 1200)
			return
		}
		saveState.value = 'error'
		saveStateTimer = setTimeout(() => {
			saveState.value = 'idle'
		}, 3000)
	}

	async function commitUpdate(patch: UpdateTaskPatch, storePatch: Partial<TaskDto> = {}) {
		if (!currentTask.value) return
		beginSave()
		try {
			await updateTask(currentTask.value.id, patch)
			if (Object.keys(storePatch).length > 0) store.patchTask(storePatch)
			endSave(true)
		} catch (error) {
			console.error('更新任务失败:', error)
			endSave(false)
		}
	}

	async function onTitleBlur() {
		if (!currentTask.value) return
		const nextTitle = titleLocal.value.trim()
		if (!nextTitle || nextTitle === currentTask.value.title) return
		await commitUpdate({ title: nextTitle }, { title: nextTitle })
	}

	async function onStatusChange(value: unknown) {
		const record = value as { value?: string } | null
		const displayStatus = (typeof value === 'string' ? value : record?.value) as 'todo' | 'doing' | 'done' | undefined
		if (!currentTask.value || !displayStatus) return

		// 映射显示状态到后端状态
		const backendStatus = mapDisplayStatusToBackend(displayStatus, currentTask.value.status)
		if (backendStatus === currentTask.value.status) return

		await commitUpdate({ status: backendStatus }, { status: backendStatus })
		statusLocal.value = displayStatus
	}

	function onStatusSegmentClick(value: string) {
		if (statusLocal.value === value) return
		onStatusChange(value)
	}

	async function onPriorityChange(value: string) {
		if (!currentTask.value || value === priorityLocal.value) return
		await commitUpdate({ priority: value }, { priority: value })
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
		await commitUpdate({ plannedStartAt }, { planned_start_at: plannedStartAt })
	}

	async function onPlannedStartDateClear() {
		plannedStartDateLocal.value = ''
		if (!currentTask.value) return
		await commitUpdate({ plannedStartAt: null }, { planned_start_at: null })
	}

	async function onPlannedEndDateChange() {
		if (!currentTask.value) return
		let plannedEndAt: number | null = null
		if (plannedEndDateLocal.value) {
			const date = new Date(plannedEndDateLocal.value)
			date.setHours(23, 59, 59, 999)
			plannedEndAt = date.getTime()
		}
		await commitUpdate({ plannedEndAt }, { planned_end_at: plannedEndAt })
	}

	async function onPlannedEndDateClear() {
		plannedEndDateLocal.value = ''
		if (!currentTask.value) return
		await commitUpdate({ plannedEndAt: null }, { planned_end_at: null })
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
		await commitUpdate({ tags: tagsLocal.value }, { tags: tagsLocal.value })
	}

	async function onNoteBlur() {
		if (!currentTask.value) return
		const nextNote = noteLocal.value.trim() || null
		if (nextNote === (currentTask.value.note || null)) return
		await commitUpdate({ note: nextNote }, { note: nextNote })
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
		timelineCollapsed.value = true

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

	function toggleTimeline() {
		timelineCollapsed.value = !timelineCollapsed.value
	}
</script>
