<template>
	<section class="space-y-4">
		<div class="flex items-center justify-between gap-3">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-lg font-semibold">
					<UIcon
						name="i-lucide-check-circle"
						class="text-green-500" />
					<span>Finish List</span>
				</div>
				<div class="text-sm text-muted">已完成任务时间线</div>
			</div>
			<div
				v-if="loading"
				class="text-xs text-muted">
				加载中…
			</div>
		</div>

		<div
			v-if="timelineItems.length === 0"
			class="text-sm text-muted">
			暂无完成记录。
		</div>

		<UTimeline
			v-else
			:items="timelineItems" />
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'
	import type { TimelineItem } from '@nuxt/ui'

	import { listProjects, type ProjectDto } from '@/services/api/projects'
	import { listTasks, type TaskDto } from '@/services/api/tasks'

	const toast = useToast()

	const loading = ref(false)
	const tasks = ref<TaskDto[]>([])
	const projects = ref<ProjectDto[]>([])

	const projectNameById = computed(() => {
		const map = new Map<string, string>()
		for (const p of projects.value) map.set(p.id, p.name)
		return map
	})

	function formatDate(ts: number): string {
		const d = new Date(ts)
		const year = d.getFullYear()
		const month = String(d.getMonth() + 1).padStart(2, '0')
		const day = String(d.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	function formatTime(ts: number): string {
		return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
	}

	function formatDuration(ms: number): string {
		if (!Number.isFinite(ms) || ms < 0) return '-'
		const totalMinutes = Math.floor(ms / 60000)
		const h = Math.floor(totalMinutes / 60)
		const m = totalMinutes % 60
		if (h <= 0) return `${m}m`
		if (m <= 0) return `${h}h`
		return `${h}h ${m}m`
	}

	const groupedByDate = computed(() => {
		const groups = new Map<string, TaskDto[]>()

		for (const t of tasks.value) {
			if (!t.completed_at) continue
			const dateKey = formatDate(t.completed_at)
			const arr = groups.get(dateKey) ?? []
			arr.push(t)
			groups.set(dateKey, arr)
		}

		// 按日期倒序排列
		const sorted = Array.from(groups.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([date, items]) => ({
				date,
				tasks: items.sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0)),
			}))

		return sorted
	})

	const timelineItems = computed<TimelineItem[]>(() => {
		const items: TimelineItem[] = []

		for (const group of groupedByDate.value) {
			// 日期分隔项
			items.push({
				date: group.date,
				title: `${group.date} · ${group.tasks.length} 个任务`,
				icon: 'i-lucide-calendar',
			})

			// 该日期下的任务
			for (const t of group.tasks) {
				const projectName = t.project_id ? projectNameById.value.get(t.project_id) : null
				const leadTime = t.completed_at ? formatDuration(t.completed_at - t.created_at) : '-'

				items.push({
					date: formatTime(t.completed_at ?? 0),
					title: t.title,
					description: `${projectName ? projectName + ' · ' : ''}Lead: ${leadTime}`,
					icon: 'i-lucide-check',
				})
			}
		}

		return items
	})

	async function refresh() {
		loading.value = true
		try {
			const [taskRows, projectRows] = await Promise.all([listTasks({ status: 'done' }), listProjects()])
			tasks.value = taskRows
			projects.value = projectRows
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
