<template>
	<section class="space-y-4">
		<!-- 顶部：标题 + 统计 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-check-circle-2"
						class="text-green-500" />
					<span>Finish List</span>
				</div>
				<div class="text-xs text-muted">完成证据库 · 按 Project / Space / 时间复盘已完成任务</div>
			</div>

			<div class="flex flex-wrap items-center gap-2 justify-end">
				<UBadge
					color="success"
					variant="soft"
					size="xs">
					本周完成 {{ stats.thisWeekCount }} 个任务
				</UBadge>
				<UBadge
					color="primary"
					variant="soft"
					size="xs">
					活跃 Project 数：{{ stats.activeProjectCount }}
				</UBadge>
				<UBadge
					color="neutral"
					variant="soft"
					size="xs">
					涉及 Space：{{ stats.spaceCount }}
				</UBadge>
				<div
					v-if="loading"
					class="text-[11px] text-muted">
					加载中…
				</div>
			</div>
		</header>

		<!-- 筛选条：时间 / Space / Project / Tag -->
		<section
			v-motion="filtersMotion"
			class="rounded-xl border border-default bg-elevated/60 px-3 py-2.5 flex flex-wrap items-center gap-2">
			<div class="flex items-center gap-1.5 text-[11px] text-muted">
				<UIcon
					name="i-lucide-filter"
					class="size-3.5" />
				<span>筛选</span>
			</div>

			<USelectMenu
				v-model="spaceFilter"
				:options="spaceOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />

			<USelectMenu
				v-model="projectFilter"
				:options="projectOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />

			<USelectMenu
				v-model="dateRange"
				:options="dateRangeOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />

			<UInput
				v-model="tagKeyword"
				size="xs"
				icon="i-lucide-hash"
				placeholder="Tag / 关键词（占位）"
				class="w-40" />
		</section>

		<!-- 按 Project 分组的完成列表 -->
		<section class="space-y-3">
			<div
				v-if="projectGroups.length === 0 && !loading"
				class="text-sm text-muted">
				暂无符合条件的完成记录。
			</div>

			<div
				v-for="(group, index) in projectGroups"
				:key="group.groupKey"
				v-motion="groupMotions[index]"
				class="rounded-xl border border-default bg-elevated/70">
				<header class="px-3 py-2.5 flex items-center justify-between gap-2 border-b border-default/70">
					<div class="flex items-center gap-2 min-w-0">
						<UIcon
							name="i-lucide-folder-check"
							class="size-4 text-amber-500" />
						<div class="flex flex-col min-w-0">
							<div class="text-sm font-medium truncate">{{ group.projectName }}</div>
							<div class="text-[11px] text-muted">{{ group.spaceLabel }} · 共 {{ group.tasks.length }} 个完成任务</div>
						</div>
					</div>

					<UBadge
						color="success"
						variant="soft"
						size="xs">
						Lead 中位数：{{ group.medianLead }}
					</UBadge>
				</header>

				<div class="divide-y divide-default/60">
					<div
						v-for="t in group.tasks"
						:key="t.id"
						class="px-3 py-2 flex items-center justify-between gap-3 text-sm">
						<div class="min-w-0">
							<div class="font-medium truncate">{{ t.title }}</div>
							<div class="text-[11px] text-muted">
								完成于 {{ formatDateTime(t.completedAt ?? 0) }} · Lead
								{{ formatDuration(t.completedAt && t.createdAt ? t.completedAt - t.createdAt : 0) }}
							</div>
						</div>
						<div class="flex items-center gap-1.5">
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								icon="i-lucide-message-circle"
								@click="onOpenReflection(t)">
								<span class="ml-1 text-[11px]">感想</span>
							</UButton>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- 完成感想记录入口（占位） -->
		<UModal
			v-model:open="reflectionOpen"
			title="完成感想"
			description="记录任务完成后的感想与复盘"
			:ui="reflectionModalUi">
			<template #body>
				<div
					v-motion="reflectionBodyMotion"
					class="space-y-3">
					<header class="space-y-1">
						<div class="flex items-center gap-2">
							<UIcon
								name="i-lucide-sparkles"
								class="size-4 text-pink-500" />
							<h2 class="text-sm font-semibold">记录完成感想</h2>
						</div>
						<p class="text-xs text-muted">与 Diary / Notes 的弱关联将在后续 v3 步骤中接入，这里先提供占位入口。</p>
					</header>

					<div class="space-y-1.5">
						<div class="text-xs text-muted">当前任务</div>
						<div class="text-xs font-medium truncate">{{ reflectionTask?.title ?? '未选择任务' }}</div>
					</div>

					<UTextarea
						v-model="reflectionText"
						placeholder="这次完成有什么收获、疑问或需要改进的地方？（占位，不落库）"
						:rows="5" />
				</div>
			</template>
			<template #footer>
				<div
					v-motion="reflectionFooterMotion"
					class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						@click="reflectionOpen = false">
						取消
					</UButton>
					<UButton
						color="primary"
						size="xs"
						@click="onReflectionSave">
						保存（占位）
					</UButton>
				</div>
			</template>
		</UModal>
	</section>
</template>

<script setup lang="ts">
	import { refDebounced, useAsyncState } from '@vueuse/core'
	import { computed, ref, watch } from 'vue'

	import { getAppStaggerDelay, useAppMotionPreset, useCardHoverMotionPreset, useMotionPresetWithDelay, withMotionDelay } from '@/composables/base/motion'
	import { DEFAULT_PROJECT_LABEL } from '@/config/project'
	import { createModalLayerUi } from '@/config/ui-layer'
	import { SPACE_DISPLAY, SPACE_IDS } from '@/config/space'
	import { listTasks, type TaskDto } from '@/services/api/tasks'
	import { useProjectsStore } from '@/stores/projects'

	const toast = useToast()
	const projectsStore = useProjectsStore()
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const filtersMotion = useAppMotionPreset('drawerSection', 'sectionBase', 18)
	const groupItemMotionPreset = useCardHoverMotionPreset()
	const reflectionBodyMotion = useMotionPresetWithDelay('modalSection', 24)
	const reflectionFooterMotion = useMotionPresetWithDelay('statusFeedback', 44)
	const groupMotions = computed(() =>
		projectGroups.value.map((_group, index) =>
			withMotionDelay(groupItemMotionPreset.value, getAppStaggerDelay(index)),
		),
	)
	const reflectionModalUi = createModalLayerUi({
		width: 'sm:max-w-md',
	})

	const { state: tasks, isLoading: loading } = useAsyncState(() => listTasks({ status: 'done' }), [] as TaskDto[], {
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

	const spaceFilter = ref<string>('all')
	const projectFilter = ref<string>('all')
	const dateRange = ref<string>('this-week')
	const tagKeyword = ref('')
	const debouncedTagKeyword = refDebounced(tagKeyword, 180)

	const reflectionOpen = ref(false)
	const reflectionTask = ref<TaskDto | null>(null)
	const reflectionText = ref('')

	const spaceOptions = [
		{ label: '所有 Space', value: 'all' },
		...SPACE_IDS.map((id) => ({ label: SPACE_DISPLAY[id].label, value: id })),
	]

	const dateRangeOptions = [
		{ label: '最近 7 天', value: 'this-week' },
		{ label: '本月', value: 'this-month' },
		{ label: '全部时间', value: 'all' },
	]

	// 预留：若后续需要在 UI 中直接显示当前筛选标签，可复用这些 computed
	// const currentSpaceLabel = computed(() => {
	// 	const found = spaceOptions.find((x) => x.value === spaceFilter.value)
	// 	return found?.label ?? '所有 Space'
	// })
	//
	// const currentDateRangeLabel = computed(() => {
	// 	const found = dateRangeOptions.find((x) => x.value === dateRange.value)
	// 	return found?.label ?? '最近 7 天'
	// })

	function formatDate(ts: number): string {
		const d = new Date(ts)
		const year = d.getFullYear()
		const month = String(d.getMonth() + 1).padStart(2, '0')
		const day = String(d.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	function formatDateTime(ts: number): string {
		const d = new Date(ts)
		const date = formatDate(ts)
		const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
		return `${date} ${time}`
	}

	function formatDuration(ms: number): string {
		if (!Number.isFinite(ms) || ms <= 0) return '-'
		const totalMinutes = Math.floor(ms / 60000)
		const h = Math.floor(totalMinutes / 60)
		const m = totalMinutes % 60
		if (h <= 0) return `${m}m`
		if (m <= 0) return `${h}h`
		return `${h}h ${m}m`
	}

	function spaceLabel(spaceId: string): string {
		return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.label ?? spaceId
	}

	const projectOptions = computed(() => {
		const all = [{ label: '所有 Project', value: 'all' }]
		const ids = new Set<string>()
		for (const t of tasks.value) {
			if (!t.completedAt || t.doneReason === 'cancelled') continue
			ids.add(t.spaceId)
		}
		const spaceIds = Array.from(ids)
		const options = []
		for (const sid of spaceIds) {
			const list = projectsStore.getProjectsOfSpace(sid)
			for (const p of list) {
				options.push({
					label: `${spaceLabel(sid)} / ${p.title}`,
					value: p.id,
				})
			}
		}
		return all.concat(options)
	})

	// const currentProjectLabel = computed(() => {
	// 	const found = projectOptions.value.find((x) => x.value === projectFilter.value)
	// 	return found?.label ?? '所有 Project'
	// })

	function isInDateRange(ts: number | null): boolean {
		if (!ts) return false
		const d = new Date(ts)
		const now = new Date()
		if (dateRange.value === 'all') return true
		if (dateRange.value === 'this-week') {
			const diffMs = now.getTime() - d.getTime()
			return diffMs <= 7 * 24 * 60 * 60 * 1000
		}
		if (dateRange.value === 'this-month') {
			return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
		}
		return true
	}

	const filteredTasks = computed(() => {
		return tasks.value.filter((t) => {
			if (!t.completedAt || t.doneReason === 'cancelled') return false
			if (!isInDateRange(t.completedAt)) return false
			if (spaceFilter.value !== 'all' && t.spaceId !== spaceFilter.value) return false
			if (projectFilter.value !== 'all' && t.projectId !== projectFilter.value) return false
			if (debouncedTagKeyword.value.trim()) {
				const kw = debouncedTagKeyword.value.trim().toLowerCase()
				if (!t.title.toLowerCase().includes(kw)) return false
			}
			return true
		})
	})

	type ProjectGroup = {
		groupKey: string
		projectId: string
		projectName: string
		spaceId: string
		spaceLabel: string
		tasks: TaskDto[]
		medianLead: string
	}

	const projectGroups = computed<ProjectGroup[]>(() => {
		const byProject = new Map<string, TaskDto[]>()

		for (const t of filteredTasks.value) {
			const key = `${t.spaceId}::${t.projectId ?? 'default'}`
			const arr = byProject.get(key) ?? []
			arr.push(t)
			byProject.set(key, arr)
		}

		const result: ProjectGroup[] = []

		for (const [groupKey, list] of byProject.entries()) {
			const sample = list[0]
			const spaceId = sample.spaceId
			const spaceLabelText = spaceLabel(spaceId)
			const projects = projectsStore.getProjectsOfSpace(spaceId)
			const project = sample.projectId ? projects.find((p) => p.id === sample.projectId) : null

			const leads: number[] = []
			for (const t of list) {
				if (t.completedAt && t.createdAt) {
					leads.push(t.completedAt - t.createdAt)
				}
			}
			leads.sort((a, b) => a - b)
			const medianMs = leads.length ? leads[Math.floor(leads.length / 2)] : 0

			result.push({
				groupKey,
				projectId: sample.projectId ?? 'default',
				projectName: project?.title ?? DEFAULT_PROJECT_LABEL,
				spaceId,
				spaceLabel: spaceLabelText,
				tasks: list,
				medianLead: formatDuration(medianMs),
			})
		}

		return result
	})

	watch(
		tasks,
		(rows) => {
			const spaceIds = Array.from(new Set(rows.map((t) => t.spaceId)))
			for (const sid of spaceIds) {
				void projectsStore.load(sid)
			}
		},
		{ immediate: true },
	)

	const stats = computed(() => {
		const thisWeekTasks = tasks.value.filter(
			(t) => t.completedAt && isInDateRange(t.completedAt) && t.doneReason !== 'cancelled',
		)
		const thisWeekCount = thisWeekTasks.length
		const activeProjectIds = new Set<string>()
		for (const t of thisWeekTasks) {
			const projects = projectsStore.getProjectsOfSpace(t.spaceId)
			if (projects[0]) activeProjectIds.add(projects[0].id)
		}
		const spaceIds = new Set(thisWeekTasks.map((t) => t.spaceId))
		return {
			thisWeekCount,
			activeProjectCount: activeProjectIds.size,
			spaceCount: spaceIds.size,
		}
	})

	function onOpenReflection(t: TaskDto) {
		reflectionTask.value = t
		reflectionText.value = ''
		reflectionOpen.value = true
	}

	function onReflectionSave() {
		toast.add({
			title: '已保存到本地占位',
			description: '实际与 Diary / Notes 的关联将在后续 v3 步骤中落地。',
			color: 'neutral',
		})
		reflectionOpen.value = false
	}
</script>
