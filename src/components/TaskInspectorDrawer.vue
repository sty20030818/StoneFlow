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
									class="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:shadow-sm active:translate-y-px"
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

					<!-- 属性行 1：优先级 + 截止时间 -->
					<section class="space-y-3">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">属性</label>
						<div class="grid grid-cols-2 gap-3">
							<!-- Priority -->
							<UPopover
								:mode="'click'"
								:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
								:ui="{ content: 'z-100' }">
								<button
									type="button"
									class="p-4 rounded-2xl border transition-all text-left w-full cursor-pointer"
									:class="priorityCardClass">
									<div class="flex items-center gap-2.5">
										<UIcon
											name="i-lucide-flag"
											class="size-4 shrink-0"
											:class="priorityIconClass" />
										<div class="min-w-0 flex-1">
											<div class="text-[11px] text-muted mb-1">Priority</div>
											<div
												class="text-xs font-semibold"
												:class="priorityTextClass">
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

							<!-- Deadline (截止时间) -->
							<UPopover
								:mode="'click'"
								:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
								:ui="{ content: 'z-100' }">
								<button
									type="button"
									class="p-4 rounded-2xl border transition-all text-left w-full cursor-pointer"
									:class="
										plannedEndDateLocal
											? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/60'
											: 'bg-elevated/50 border-default/60 hover:bg-elevated/80'
									">
									<div class="flex items-center gap-2.5">
										<UIcon
											name="i-lucide-alarm-clock"
											class="size-4 shrink-0"
											:class="plannedEndDateLocal ? 'text-indigo-500' : 'text-muted'" />
										<div class="min-w-0 flex-1">
											<div class="text-[11px] text-muted mb-1">DeadLine</div>
											<div
												class="text-xs font-semibold"
												:class="plannedEndDateLocal ? 'text-indigo-600' : 'text-muted'">
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
						</div>
					</section>

					<!-- 项目路径 -->
					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">项目路径</label>
						<div class="p-4 rounded-2xl bg-elevated/50 border border-default/60 hover:bg-elevated/80 transition-all">
							<div class="flex items-center gap-2.5">
								<UIcon
									name="i-lucide-folder-open"
									class="size-4 text-amber-400 shrink-0" />
								<UInput
									v-model="projectPathLocal"
									placeholder="输入本地项目路径..."
									size="sm"
									variant="none"
									:ui="{
										root: 'flex-1',
										base: 'px-2 py-0 text-xs font-mono bg-transparent border-none focus:ring-0 placeholder:text-muted/40 rounded-none',
										rounded: 'rounded-none',
									}"
									@blur="onProjectPathBlur" />
							</div>
						</div>
					</section>

					<!-- Tags -->
					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Tags</label>
						<div class="flex flex-wrap gap-2 items-center">
							<div
								v-for="tag in tagsLocal"
								:key="tag"
								class="group relative px-3 py-1.5 bg-white rounded-lg text-xs font-bold shadow-sm border border-default/40 text-default flex items-center justify-center cursor-default hover:border-primary/50 transition-colors overflow-hidden">
								<span>#{{ tag }}</span>
								<!-- Overlay Delete Button -->
								<div
									class="hidden group-hover:flex absolute inset-0 bg-white/95 items-center justify-center cursor-pointer transition-opacity"
									@click="removeTag(tag)">
									<UIcon
										name="i-lucide-x"
										class="size-3 text-red-500" />
								</div>
							</div>

							<!-- Inline Input -->
							<div class="flex items-center">
								<input
									v-model="tagInput"
									type="text"
									placeholder="+ New Tag"
									class="bg-transparent border-none text-xs font-medium placeholder:text-muted/60 focus:ring-0 focus:outline-none w-[100px] h-8 px-2"
									@keydown.enter.prevent="addTag"
									@blur="onTagInputBlur" />
							</div>
						</div>
					</section>

					<!-- 所属 Space + Project -->
					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">位置分类</label>
						<div class="grid grid-cols-2 gap-3">
							<!-- Space -->
							<UPopover
								:mode="'click'"
								:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
								:ui="{ content: 'z-100' }">
								<button
									type="button"
									class="p-4 rounded-2xl border transition-all text-left w-full cursor-pointer"
									:class="spaceCardClass">
									<div class="flex items-center justify-between">
										<div class="flex flex-col gap-1">
											<span
												class="text-[10px] font-bold uppercase tracking-wider"
												:class="spaceCardLabelClass">
												所属 Space
											</span>
											<span
												class="text-sm font-bold"
												:class="spaceCardValueClass">
												{{ currentSpaceLabel }}
											</span>
										</div>
										<UIcon
											name="i-lucide-chevron-right"
											class="size-4"
											:class="spaceCardLabelClass" />
									</div>
								</button>
								<template #content>
									<div class="p-2 min-w-[180px]">
										<div
											v-for="space in spaceOptions"
											:key="space.value"
											class="px-3 py-2 rounded-lg hover:bg-elevated cursor-pointer transition-colors"
											:class="{ 'bg-elevated': spaceIdLocal === space.value }"
											@click="onSpaceChange(space.value)">
											<div class="flex items-center gap-2">
												<UIcon
													:name="space.icon"
													class="size-4 shrink-0"
													:class="space.iconClass" />
												<span class="text-sm font-medium">{{ space.label }}</span>
											</div>
										</div>
									</div>
								</template>
							</UPopover>

							<!-- Project -->
							<UPopover
								:mode="'click'"
								:popper="{ strategy: 'fixed', placement: 'bottom-end' }"
								:ui="{ content: 'z-100' }">
								<button
									type="button"
									class="p-4 rounded-2xl bg-elevated/50 border border-default/60 hover:bg-elevated/80 transition-all text-left w-full cursor-pointer">
									<div class="flex items-center justify-between">
										<div class="flex flex-col gap-1">
											<span class="text-[10px] font-bold text-muted uppercase tracking-wider">所属 Project</span>
											<span class="text-sm font-bold text-default truncate max-w-[120px]">
												{{ currentProjectLabel }}
											</span>
										</div>
										<UIcon
											name="i-lucide-chevron-right"
											class="size-4 text-muted" />
									</div>
								</button>
								<template #content>
									<div class="p-2 min-w-[220px] max-h-[300px] overflow-y-auto">
										<div
											v-for="project in projectOptions"
											:key="project.value ?? 'uncategorized'"
											class="px-3 py-2 rounded-lg hover:bg-elevated cursor-pointer transition-colors"
											:class="{ 'bg-elevated': projectIdLocal === project.value }"
											:style="{ paddingLeft: `${12 + project.depth * 12}px` }"
											@click="onProjectChange(project.value)">
											<div class="flex items-center gap-2">
												<UIcon
													:name="project.icon"
													class="size-4 shrink-0"
													:class="project.iconClass" />
												<span class="text-sm truncate">{{ project.label }}</span>
											</div>
										</div>
									</div>
								</template>
							</UPopover>
						</div>
					</section>

					<!-- 备注 -->
					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Note</label>
						<div class="p-4 rounded-2xl border bg-elevated/50 border-default/60 hover:bg-elevated/80 transition-all">
							<UTextarea
								v-model="noteLocal"
								placeholder="记录一些背景信息、想法或链接…"
								:rows="6"
								size="sm"
								autoresize
								variant="none"
								:ui="{
									root: 'w-full',
									base: 'p-0 text-sm leading-relaxed bg-transparent border-none focus:ring-0 placeholder:text-muted/40',
								}"
								@blur="onNoteBlur" />
						</div>
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
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
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
	const refreshSignals = useRefreshSignalsStore()

	const currentTask = computed<TaskDto | null>(() => store.task ?? null)

	const titleLocal = ref('')
	const statusLocal = ref<'todo' | 'doing' | 'done'>('todo')
	const priorityLocal = ref<string>('P1')
	const plannedEndDateLocal = ref<string>('')
	const noteLocal = ref<string>('')
	const tagsLocal = ref<string[]>([])
	const tagInput = ref('')
	const timelineCollapsed = ref(true)
	const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
	const pendingSaves = ref(0)
	let saveStateTimer: ReturnType<typeof setTimeout> | null = null

	// 新增：项目路径、Space、Project 本地状态
	const projectPathLocal = ref<string>('')
	const spaceIdLocal = ref<string>('')
	const projectIdLocal = ref<string | null>(null)

	function onTagInputBlur() {
		if (tagInput.value.trim()) {
			addTag()
		}
	}

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

	// Priority 卡片样式
	const priorityCardClass = computed(() => {
		const p = priorityLocal.value
		if (p === 'P0') return 'bg-red-50/50 border-red-200 hover:bg-red-50/80'
		if (p === 'P1') return 'bg-amber-50/50 border-amber-200 hover:bg-amber-50/80'
		if (p === 'P2') return 'bg-blue-50/50 border-blue-200 hover:bg-blue-50/80'
		return 'bg-elevated/50 border-default/60 hover:bg-elevated/80'
	})

	const priorityIconClass = computed(() => {
		const p = priorityLocal.value
		if (p === 'P0') return 'text-red-500'
		if (p === 'P1') return 'text-amber-500'
		if (p === 'P2') return 'text-blue-500'
		return 'text-muted'
	})

	const priorityTextClass = computed(() => {
		const p = priorityLocal.value
		if (p === 'P0') return 'text-red-600'
		if (p === 'P1') return 'text-amber-600'
		if (p === 'P2') return 'text-blue-600'
		return 'text-default'
	})

	// Space 选项
	const spaceOptions = computed(() => {
		// 简化版：硬编码常用 Space
		return [
			{ value: 'work', label: 'Work', icon: 'i-lucide-briefcase', iconClass: 'text-blue-500' },
			{ value: 'personal', label: 'Personal', icon: 'i-lucide-user', iconClass: 'text-purple-500' },
			{ value: 'study', label: 'Study', icon: 'i-lucide-book-open', iconClass: 'text-emerald-500' },
		]
	})

	// Space 卡片样式
	const spaceCardClass = computed(() => {
		const sid = spaceIdLocal.value
		if (sid === 'work') return 'bg-blue-50/50 border-blue-200'
		if (sid === 'personal') return 'bg-purple-50/50 border-purple-200'
		if (sid === 'study') return 'bg-emerald-50/50 border-emerald-200'
		return 'bg-elevated/50 border-default/60'
	})

	const spaceCardLabelClass = computed(() => {
		const sid = spaceIdLocal.value
		if (sid === 'work') return 'text-blue-400'
		if (sid === 'personal') return 'text-purple-400'
		if (sid === 'study') return 'text-emerald-400'
		return 'text-muted'
	})

	const spaceCardValueClass = computed(() => {
		const sid = spaceIdLocal.value
		if (sid === 'work') return 'text-blue-600'
		if (sid === 'personal') return 'text-purple-600'
		if (sid === 'study') return 'text-emerald-600'
		return 'text-default'
	})

	// Project 选项（基于当前 Space 的项目树）
	const projectOptions = computed(() => {
		const sid = spaceIdLocal.value
		if (!sid) return []
		const projects = projectsStore.getProjectsOfSpace(sid)
		const levelColors = ['text-slate-400', 'text-blue-400', 'text-purple-400', 'text-pink-400']

		const options: Array<{ value: string | null; label: string; icon: string; iconClass: string; depth: number }> = []

		// 添加"未分类"选项
		options.push({
			value: null,
			label: '未分类',
			icon: 'i-lucide-inbox',
			iconClass: 'text-slate-400',
			depth: 0,
		})

		// 递归添加项目
		function addProjects(parentId: string | null, depth: number) {
			const children = projects.filter((p) => p.parent_id === parentId)
			for (const proj of children) {
				options.push({
					value: proj.id,
					label: proj.name,
					icon: 'i-lucide-folder',
					iconClass: levelColors[Math.min(depth, levelColors.length - 1)],
					depth,
				})
				addProjects(proj.id, depth + 1)
			}
		}
		addProjects(null, 0)

		return options
	})

	// 当前 Project 标签
	const currentProjectLabel = computed(() => {
		if (!projectIdLocal.value) return '未分类'
		const projects = projectsStore.getProjectsOfSpace(spaceIdLocal.value)
		const proj = projects.find((p) => p.id === projectIdLocal.value)
		return proj?.name ?? '未知项目'
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
			// 发布刷新信号，确保主视图列与筛选结果一致
			refreshSignals.bumpTask()
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

	// DeadLine 功能
	async function onPlannedEndDateChange() {
		if (!currentTask.value) return
		const val = plannedEndDateLocal.value
		if (!val) {
			await commitUpdate({ plannedEndDate: null }, { planned_end_date: null })
			return
		}
		// web date string yyyy-mm-dd -> timestamp (local midnight)
		const date = new Date(val)
		const ts = date.getTime()
		await commitUpdate({ plannedEndDate: ts }, { planned_end_date: ts })
	}

	async function onPlannedEndDateClear() {
		plannedEndDateLocal.value = ''
		await onPlannedEndDateChange()
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

	// 项目路径变更
	async function onProjectPathBlur() {
		if (!currentTask.value) return
		const nextPath = projectPathLocal.value.trim() || null
		if (nextPath === (currentTask.value.project_path || null)) return
		await commitUpdate({ projectPath: nextPath }, { project_path: nextPath })
	}

	// Space 切换
	async function onSpaceChange(value: string) {
		if (!currentTask.value || value === spaceIdLocal.value) return
		spaceIdLocal.value = value
		// 切换 Space 后，清空 Project 选择
		projectIdLocal.value = null

		await commitUpdate({ spaceId: value, projectId: null }, { space_id: value, project_id: null })
	}

	// Project 切换
	async function onProjectChange(value: string | null) {
		if (!currentTask.value || value === projectIdLocal.value) return
		projectIdLocal.value = value

		await commitUpdate({ projectId: value }, { project_id: value })
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

		// 处理截止日期
		if (t.planned_end_date) {
			const d = new Date(t.planned_end_date)
			const year = d.getFullYear()
			const month = String(d.getMonth() + 1).padStart(2, '0')
			const day = String(d.getDate()).padStart(2, '0')
			plannedEndDateLocal.value = `${year}-${month}-${day}`
		} else {
			plannedEndDateLocal.value = ''
		}

		// 同步项目路径、Space、Project
		projectPathLocal.value = t.project_path || ''
		spaceIdLocal.value = t.space_id
		projectIdLocal.value = t.project_id
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
