<template>
	<section class="space-y-4">
		<!-- 顶部标题 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-1">
			<div class="flex items-center gap-2 text-sm font-semibold">
				<UIcon
					name="i-lucide-bar-chart-3"
					class="text-blue-500" />
				<span>Stats</span>
			</div>
			<div class="text-xs text-muted">Space 关键指标 · 完成趋势 · 状态分布</div>
		</header>

		<!-- 关键指标卡片：每个 Space 的「本周完成数 / 活跃 Project 数」 -->
		<section class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<UCard
				v-for="(s, index) in spaceCards"
				:key="s.id"
				v-motion="spaceCardMotions[index]"
				class="cursor-pointer hover:bg-default transition-colors duration-150"
				@click="goToFinishList(s.id)">
				<template #header>
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<UIcon
								:name="s.icon"
								:class="s.iconClass" />
							<div class="text-sm font-semibold">{{ s.label }}</div>
						</div>
						<UButton
							color="neutral"
							variant="ghost"
							size="2xs"
							icon="i-lucide-arrow-right"
							@click.stop="goToLogs(s.id)">
							<span class="ml-1 text-[11px]">Logs</span>
						</UButton>
					</div>
				</template>

				<div class="flex items-end justify-between gap-2">
					<div>
						<div class="text-xs text-muted mb-0.5">本周完成</div>
						<div class="text-2xl font-bold">{{ s.thisWeekDone }}</div>
					</div>
					<div class="text-right">
						<div class="text-xs text-muted mb-0.5">活跃 Project</div>
						<div class="text-lg font-semibold">{{ s.activeProjects }}</div>
					</div>
				</div>
			</UCard>
		</section>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- 最近 7 天完成数折线图（简化为条形趋势） -->
			<UCard
				v-motion="trendCardMotion"
				class="lg:col-span-2">
				<template #header>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UIcon
								name="i-lucide-line-chart"
								class="size-4 text-emerald-500" />
							<div class="text-sm font-semibold">最近 7 天完成趋势</div>
						</div>
					</div>
				</template>

				<div class="space-y-1">
					<div
						v-for="d in last7d"
						:key="d.date"
						class="flex items-center gap-2 text-xs">
						<div class="w-16 text-muted">{{ d.date }}</div>
						<div class="flex-1 h-3 rounded-full bg-default/60 overflow-hidden">
							<div
								class="h-full rounded-full bg-emerald-500/80"
								:style="{ width: `${d.percent}%` }" />
						</div>
						<div class="w-8 text-right text-muted">{{ d.count }}</div>
					</div>
				</div>
			</UCard>

			<!-- 状态分布 -->
			<UCard v-motion="statusCardMotion">
				<template #header>
					<div class="flex items-center gap-2">
						<UIcon
							name="i-lucide-pie-chart"
							class="size-4 text-purple-500" />
						<div class="text-sm font-semibold">状态分布</div>
					</div>
				</template>

				<div class="space-y-3">
					<div class="relative w-28 h-28 mx-auto">
						<svg
							viewBox="0 0 36 36"
							class="w-full h-full -rotate-90 text-muted/20">
							<circle
								cx="18"
								cy="18"
								r="15.9155"
								fill="none"
								stroke="currentColor"
								stroke-width="3" />
							<circle
								v-for="slice in statusSlices"
								:key="slice.key"
								cx="18"
								cy="18"
								r="15.9155"
								fill="none"
								:stroke="slice.color"
								stroke-width="3"
								stroke-linecap="round"
								:stroke-dasharray="`${slice.percent} ${100 - slice.percent}`"
								:stroke-dashoffset="slice.offset" />
						</svg>
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="text-xs text-muted text-center">
								<div class="text-[11px]">总任务</div>
								<div class="text-base font-semibold">{{ statusTotal }}</div>
							</div>
						</div>
					</div>

					<div class="space-y-1">
						<div
							v-for="s in statusSlices"
							:key="s.key"
							class="flex items-center justify-between text-xs">
							<div class="flex items-center gap-2">
								<span
									class="inline-flex w-2.5 h-2.5 rounded-full"
									:style="{ backgroundColor: s.color }" />
								<span>{{ s.label }}</span>
							</div>
							<div class="text-muted">{{ s.count }} · {{ s.percent }}%</div>
						</div>
					</div>
					<div
						v-if="loading"
						class="text-xs text-muted">
						正在加载统计数据...
					</div>
				</div>
			</UCard>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useAsyncState } from '@vueuse/core'
	import { computed } from 'vue'
	import { useRouter } from 'vue-router'

	import {
		createStaggeredEnterMotions,
		getAppStaggerDelay,
		useAppMotionPreset,
		useMotionPreset,
	} from '@/composables/base/motion'
	import { toBoundedPercent } from '@/composables/base/percent'
	import {
		TASK_DONE_REASON_COLORS,
		TASK_DONE_REASON_LABELS,
		TASK_STATUS_CHART_COLORS,
		TASK_STATUS_LABELS,
	} from '@/config/task'
	import { SPACE_DISPLAY, SPACE_IDS } from '@/config/space'
	import { listTasks, type TaskDto } from '@/services/api/tasks'

	const toast = useToast()
	const router = useRouter()
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const cardMotionPreset = useMotionPreset('card')
	const trendCardMotion = useAppMotionPreset('card', 'sectionBase', 46)
	const statusCardMotion = useAppMotionPreset('card', 'sectionBase', 60)
	const spaceCardMotions = computed(() =>
		createStaggeredEnterMotions(spaceCards.value.length, cardMotionPreset.value, getAppStaggerDelay),
	)

	const { state: tasks, isLoading: loading } = useAsyncState(
		async () => {
			const [todo, done] = await Promise.all([listTasks({ status: 'todo' }), listTasks({ status: 'done' })])
			return [...todo, ...done]
		},
		[] as TaskDto[],
		{
			immediate: true,
			resetOnExecute: false,
			onError: (e) => {
				toast.add({
					title: '加载统计失败',
					description: e instanceof Error ? e.message : '未知错误',
					color: 'error',
				})
			},
		},
	)

	const spaceCards = computed(() => {
		const ids = SPACE_IDS

		const now = new Date()
		const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime()

		return ids.map((id) => {
			const info = SPACE_DISPLAY[id]
			const scoped = tasks.value.filter((t) => t.spaceId === id)

			const thisWeekDone = scoped.filter(
				(t) => t.completedAt && t.completedAt >= startOfWeek && t.doneReason !== 'cancelled',
			).length

			const activeProjectIds = new Set<string>()
			for (const t of scoped) {
				if (t.status === 'todo') {
					activeProjectIds.add('default')
				}
			}

			return {
				...info,
				thisWeekDone,
				activeProjects: activeProjectIds.size,
			}
		})
	})

	const last7d = computed(() => {
		const days: { date: string; count: number; percent: number }[] = []
		const now = new Date()

		for (let i = 6; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
			const key = `${d.getMonth() + 1}/${d.getDate()}`
			const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
			const end = start + 24 * 60 * 60 * 1000

			const count = tasks.value.filter(
				(t) => t.completedAt && t.completedAt >= start && t.completedAt < end && t.doneReason !== 'cancelled',
			).length
			days.push({ date: key, count, percent: 0 })
		}

		const max = days.reduce((m, d) => (d.count > m ? d.count : m), 0)
		for (const d of days) {
			d.percent = max > 0 ? toBoundedPercent((d.count / max) * 100, 6, 100) : 0
		}
		return days
	})

	const statusTotal = computed(() => tasks.value.length)

	type Slice = {
		key: string
		label: string
		color: string
		count: number
		percent: number
		offset: number
	}

	const statusSlices = computed<Slice[]>(() => {
		const buckets: { key: string; label: string; color: string; match: (t: TaskDto) => boolean }[] = [
			{
				key: 'done',
				label: TASK_DONE_REASON_LABELS.completed,
				color: TASK_DONE_REASON_COLORS.completed,
				match: (t) => t.status === 'done' && t.doneReason !== 'cancelled',
			},
			{
				key: 'cancelled',
				label: TASK_DONE_REASON_LABELS.cancelled,
				color: TASK_DONE_REASON_COLORS.cancelled,
				match: (t) => t.status === 'done' && t.doneReason === 'cancelled',
			},
			{
				key: 'todo',
				label: TASK_STATUS_LABELS.todo,
				color: TASK_STATUS_CHART_COLORS.todo,
				match: (t) => t.status === 'todo',
			},
		]

		const total = tasks.value.length || 1
		let offset = 25
		const slices: Slice[] = []

		for (const b of buckets) {
			const count = tasks.value.filter(b.match).length
			const percent = toBoundedPercent((count / total) * 100)
			if (percent <= 0) continue
			const slice: Slice = {
				key: b.key,
				label: b.label,
				color: b.color,
				count,
				percent,
				offset,
			}
			offset -= (percent / 100) * 100
			slices.push(slice)
		}

		return slices
	})

	function goToFinishList(_spaceId: string) {
		router.push({ path: '/finish-list' })
	}

	function goToLogs(_spaceId: string) {
		router.push({ path: '/logs' })
	}
</script>
