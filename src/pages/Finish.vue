<template>
	<section class="space-y-4">
		<div class="flex items-center justify-between gap-3">
			<div class="space-y-1">
				<div class="text-lg font-semibold">Finish</div>
				<div class="text-sm text-muted">已完成任务（status = done），按项目分组展示。</div>
			</div>
			<div
				class="text-xs text-muted"
				v-if="loading">
				加载中…
			</div>
		</div>

		<div
			v-if="groups.length === 0"
			class="text-sm text-muted">
			暂无完成记录。
		</div>

		<div class="space-y-4">
			<div
				v-for="g in groups"
				:key="g.key"
				class="space-y-2">
				<div class="text-sm font-semibold text-default">
					{{ groupTitle(g.key) }}
					<span class="text-xs text-muted">（{{ g.tasks.length }}）</span>
				</div>

				<div class="space-y-2">
					<div
						v-for="t in g.tasks"
						:key="t.id"
						class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3">
						<div class="min-w-0">
							<div class="text-sm font-medium truncate">{{ t.title }}</div>
							<div class="text-xs text-muted">Lead：{{ leadTime(t) }} · Execution：{{ executionTime(t) }}</div>
						</div>

						<div class="text-xs text-muted shrink-0">
							{{ new Date(t.completed_at ?? 0).toLocaleString() }}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref, watch } from 'vue'

	import { listProjects, type ProjectDto } from '@/services/api/projects'
	import { listTasks, type TaskDto } from '@/services/api/tasks'
	import { useSettingsStore } from '@/stores/settings'

	const toast = useToast()
	const settingsStore = useSettingsStore()

	const loading = ref(false)
	const tasks = ref<TaskDto[]>([])
	const projects = ref<ProjectDto[]>([])

	const activeSpaceId = computed(() => settingsStore.settings.activeSpaceId)

	const projectNameById = computed(() => {
		const map = new Map<string, string>()
		for (const p of projects.value) {
			map.set(p.id, p.name)
		}
		return map
	})

	function formatDuration(ms: number): string {
		if (!Number.isFinite(ms) || ms < 0) return '-'
		const totalMinutes = Math.floor(ms / 60000)
		const h = Math.floor(totalMinutes / 60)
		const m = totalMinutes % 60
		if (h <= 0) return `${m}m`
		if (m <= 0) return `${h}h`
		return `${h}h ${m}m`
	}

	const groups = computed(() => {
		const grouped = new Map<string, TaskDto[]>()

		for (const t of tasks.value) {
			const key = t.project_id ?? '__inbox__'
			const arr = grouped.get(key) ?? []
			arr.push(t)
			grouped.set(key, arr)
		}

		const out = Array.from(grouped.entries()).map(([key, arr]) => {
			arr.sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0))
			return { key, tasks: arr }
		})

		// 组排序：按组内最新完成时间倒序；Inbox 组放最后（更符合常见阅读习惯）
		out.sort((a, b) => {
			if (a.key === '__inbox__') return 1
			if (b.key === '__inbox__') return -1
			const aTop = a.tasks[0]?.completed_at ?? 0
			const bTop = b.tasks[0]?.completed_at ?? 0
			return bTop - aTop
		})

		return out
	})

	async function refresh() {
		loading.value = true
		try {
			const spaceId = activeSpaceId.value === 'all' ? undefined : activeSpaceId.value
			tasks.value = await listTasks({ spaceId, status: 'done' })
			projects.value = await listProjects(spaceId)
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

	function groupTitle(key: string): string {
		if (key === '__inbox__') return '未归档 / Inbox'
		return projectNameById.value.get(key) ?? '未知项目'
	}

	function leadTime(t: TaskDto): string {
		if (t.completed_at == null) return '-'
		return formatDuration(t.completed_at - t.created_at)
	}

	function executionTime(t: TaskDto): string {
		if (t.completed_at == null || t.started_at == null) return '-'
		return formatDuration(t.completed_at - t.started_at)
	}

	onMounted(async () => {
		await settingsStore.load()
		await refresh()
	})

	watch(activeSpaceId, async () => {
		await refresh()
	})
</script>
