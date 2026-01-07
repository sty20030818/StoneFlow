import { computed, onMounted, ref } from 'vue'

import { listTasks, type TaskDto } from '@/services/api/tasks'

/**
 * Dashboard 数据加载逻辑
 */
export function useDashboard() {
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

	return {
		loading,
		stats,
		spaceStats,
		recentDone,
		spaceLabel,
		timeAgo,
		refresh,
	}
}
