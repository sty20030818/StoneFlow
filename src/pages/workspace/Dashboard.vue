<template>
	<section class="space-y-6">
		<div class="space-y-1">
			<div class="text-lg font-semibold">📊 Dashboard</div>
			<div class="text-sm text-muted">任务概览与统计</div>
		</div>

		<!-- 统计卡片 -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="rounded-lg border border-default bg-elevated p-4 space-y-2">
				<div class="flex items-center gap-2 text-sm text-muted">
					<UIcon
						name="i-lucide-loader"
						class="text-blue-500" />
					<span>进行中</span>
				</div>
				<div class="text-3xl font-bold">{{ stats.doing }}</div>
			</div>

			<div class="rounded-lg border border-default bg-elevated p-4 space-y-2">
				<div class="flex items-center gap-2 text-sm text-muted">
					<UIcon
						name="i-lucide-list-todo"
						class="text-orange-500" />
					<span>待办</span>
				</div>
				<div class="text-3xl font-bold">{{ stats.todo }}</div>
			</div>

			<div class="rounded-lg border border-default bg-elevated p-4 space-y-2">
				<div class="flex items-center gap-2 text-sm text-muted">
					<UIcon
						name="i-lucide-check-circle"
						class="text-green-500" />
					<span>今日完成</span>
				</div>
				<div class="text-3xl font-bold">{{ stats.doneToday }}</div>
			</div>
		</div>

		<!-- Space 概览 -->
		<div class="space-y-3">
			<div class="text-sm font-semibold text-default">Space 概览</div>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<RouterLink
					to="/work"
					class="rounded-lg border border-default bg-elevated p-4 hover:bg-default transition space-y-2">
					<div class="flex items-center gap-2">
						<UIcon
							name="i-lucide-briefcase"
							class="text-blue-500" />
						<span class="font-medium">Work</span>
					</div>
					<div class="text-sm text-muted">{{ spaceStats.work }} 个任务</div>
				</RouterLink>

				<RouterLink
					to="/personal"
					class="rounded-lg border border-default bg-elevated p-4 hover:bg-default transition space-y-2">
					<div class="flex items-center gap-2">
						<UIcon
							name="i-lucide-user"
							class="text-purple-500" />
						<span class="font-medium">Personal</span>
					</div>
					<div class="text-sm text-muted">{{ spaceStats.personal }} 个任务</div>
				</RouterLink>

				<RouterLink
					to="/study"
					class="rounded-lg border border-default bg-elevated p-4 hover:bg-default transition space-y-2">
					<div class="flex items-center gap-2">
						<UIcon
							name="i-lucide-book-open"
							class="text-green-500" />
						<span class="font-medium">Study</span>
					</div>
					<div class="text-sm text-muted">{{ spaceStats.study }} 个任务</div>
				</RouterLink>
			</div>
		</div>

		<!-- 最近完成 -->
		<div class="space-y-3">
			<div class="text-sm font-semibold text-default">最近完成</div>
			<div
				v-if="recentDone.length === 0"
				class="text-sm text-muted">
				暂无完成记录
			</div>
			<div
				v-else
				class="space-y-2">
				<div
					v-for="t in recentDone"
					:key="t.id"
					class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3">
					<div class="min-w-0">
						<div class="text-sm font-medium truncate">{{ t.title }}</div>
						<div class="text-xs text-muted">{{ spaceLabel(t.space_id) }}</div>
					</div>
					<div class="text-xs text-muted shrink-0">
						{{ timeAgo(t.completed_at) }}
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'

	import { listTasks, type TaskDto } from '@/services/api/tasks'

	const toast = useToast()

	const loading = ref(false)
	const allTasks = ref<TaskDto[]>([])

	const stats = computed(() => {
		const doing = allTasks.value.filter((t) => t.status === 'doing').length
		const todo = allTasks.value.filter((t) => t.status === 'todo').length
		const doneToday = allTasks.value.filter((t) => {
			if (t.status !== 'done' || !t.completed_at) return false
			return isTodayLocal(t.completed_at)
		}).length
		return { doing, todo, doneToday }
	})

	const spaceStats = computed(() => {
		const work = allTasks.value.filter((t) => t.space_id === 'work' && t.status !== 'done').length
		const personal = allTasks.value.filter((t) => t.space_id === 'personal' && t.status !== 'done').length
		const study = allTasks.value.filter((t) => t.space_id === 'study' && t.status !== 'done').length
		return { work, personal, study }
	})

	const recentDone = computed(() => {
		return allTasks.value
			.filter((t) => t.status === 'done' && t.completed_at)
			.sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0))
			.slice(0, 5)
	})

	function isTodayLocal(ts: number): boolean {
		const d = new Date(ts)
		const now = new Date()
		return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
	}

	function spaceLabel(spaceId: string): string {
		const labels: Record<string, string> = {
			work: '💼 Work',
			personal: '👤 Personal',
			study: '📚 Study',
		}
		return labels[spaceId] ?? spaceId
	}

	function timeAgo(ts: number | null): string {
		if (!ts) return ''
		const diff = Date.now() - ts
		const minutes = Math.floor(diff / 60000)
		if (minutes < 1) return '刚刚'
		if (minutes < 60) return `${minutes} 分钟前`
		const hours = Math.floor(minutes / 60)
		if (hours < 24) return `${hours} 小时前`
		const days = Math.floor(hours / 24)
		return `${days} 天前`
	}

	async function refresh() {
		loading.value = true
		try {
			const [doingRows, todoRows, doneRows] = await Promise.all([
				listTasks({ status: 'doing' }),
				listTasks({ status: 'todo' }),
				listTasks({ status: 'done' }),
			])
			allTasks.value = [...doingRows, ...todoRows, ...doneRows]
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
