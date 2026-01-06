<template>
	<section class="space-y-4">
		<div class="flex items-center justify-between gap-3">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-lg font-semibold">
					<UIcon
						name="i-lucide-list-checks"
						class="text-primary" />
					<span>All Tasks</span>
				</div>
				<div class="text-sm text-muted">所有任务的进行中 / 待办 / 已完成</div>
			</div>
			<div
				v-if="loading"
				class="text-xs text-muted">
				加载中…
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- 进行中 -->
			<div class="rounded-md border border-default bg-elevated p-3 space-y-3">
				<div class="flex items-center justify-between">
					<div class="text-sm font-semibold text-default">进行中</div>
					<div class="text-xs text-muted">({{ doing.length }})</div>
				</div>

				<div
					v-if="doing.length === 0"
					class="text-sm text-muted">
					暂无进行中任务。
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="t in doing"
						:key="t.id"
						class="p-3 rounded-md border border-default bg-default flex items-center justify-between gap-3 cursor-pointer hover:bg-elevated transition"
						@click="onTaskClick(t)">
						<div class="min-w-0">
							<div class="text-sm font-medium truncate">{{ t.title }}</div>
							<div class="text-xs text-muted">{{ spaceLabel(t.space_id) }}</div>
						</div>
						<UButton
							size="sm"
							label="完成"
							color="success"
							variant="subtle"
							@click.stop="onComplete(t.id)" />
					</div>
				</div>
			</div>

			<!-- 待办 -->
			<div class="rounded-md border border-default bg-elevated p-3 space-y-3">
				<div class="flex items-center justify-between">
					<div class="text-sm font-semibold text-default">待办</div>
					<div class="text-xs text-muted">({{ todo.length }})</div>
				</div>

				<div
					v-if="todo.length === 0"
					class="text-sm text-muted">
					暂无待办任务。
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="t in todo"
						:key="t.id"
						class="p-3 rounded-md border border-default bg-default flex items-center justify-between gap-3 cursor-pointer hover:bg-elevated transition"
						@click="onTaskClick(t)">
						<div class="min-w-0">
							<div class="text-sm font-medium truncate">{{ t.title }}</div>
							<div class="text-xs text-muted">{{ spaceLabel(t.space_id) }}</div>
						</div>
						<UButton
							size="sm"
							label="完成"
							color="success"
							variant="subtle"
							@click.stop="onComplete(t.id)" />
					</div>
				</div>
			</div>

			<!-- 已完成 -->
			<div class="rounded-md border border-default bg-elevated p-3 space-y-3">
				<div class="flex items-center justify-between">
					<div class="text-sm font-semibold text-default">已完成（今天）</div>
					<div class="text-xs text-muted">({{ doneToday.length }})</div>
				</div>

				<div
					v-if="doneToday.length === 0"
					class="text-sm text-muted">
					今天还没有完成记录。
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="t in doneToday"
						:key="t.id"
						class="p-3 rounded-md border border-default bg-default flex items-center justify-between gap-3 cursor-pointer hover:bg-elevated transition"
						@click="onTaskClick(t)">
						<div class="min-w-0">
							<div class="text-sm font-medium truncate">{{ t.title }}</div>
							<div class="text-xs text-muted">{{ spaceLabel(t.space_id) }}</div>
						</div>
						<div class="text-xs text-muted shrink-0">
							{{ new Date(t.completed_at ?? 0).toLocaleTimeString() }}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { onMounted, ref } from 'vue'

	import { completeTask, listTasks, type TaskDto } from '@/services/api/tasks'

	const toast = useToast()

	const loading = ref(false)
	const doing = ref<TaskDto[]>([])
	const todo = ref<TaskDto[]>([])
	const doneToday = ref<TaskDto[]>([])

	function isTodayLocal(ts: number | null): boolean {
		if (!ts) return false
		const d = new Date(ts)
		const now = new Date()
		return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
	}

	function spaceLabel(spaceId: string): string {
		const labels: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		return labels[spaceId] ?? spaceId
	}

	async function refresh() {
		loading.value = true
		try {
			const [doingRows, todoRows, doneRows] = await Promise.all([
				listTasks({ status: 'doing' }),
				listTasks({ status: 'todo' }),
				listTasks({ status: 'done' }),
			])

			doing.value = doingRows
			todo.value = todoRows
			doneToday.value = doneRows.filter((t) => isTodayLocal(t.completed_at ?? null))
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

	async function onComplete(taskId: string) {
		try {
			await completeTask(taskId)
			toast.add({ title: '已完成', color: 'success' })
			await refresh()
		} catch (e) {
			toast.add({
				title: '完成失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	function onTaskClick(task: TaskDto) {
		console.log('Task clicked:', task)
	}

	onMounted(async () => {
		await refresh()
	})
</script>
