<template>
	<section class="space-y-4">
		<PageHeader
			title="Work"
			description="工作相关任务"
			icon="i-lucide-briefcase"
			icon-class="text-blue-500" />

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- 进行中 -->
			<UCard>
				<template #header>
					<div class="flex items-center justify-between">
						<div class="text-sm font-semibold text-default">进行中</div>
						<template v-if="loading">
							<USkeleton class="h-5 w-6 rounded-full" />
						</template>
						<UBadge
							v-else
							color="neutral"
							variant="subtle"
							size="sm">
							{{ doing.length }}
						</UBadge>
					</div>
				</template>

				<template v-if="loading">
					<div class="space-y-2">
						<div
							v-for="i in 2"
							:key="i"
							class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3">
							<div class="space-y-2 flex-1">
								<USkeleton class="h-4 w-3/4" />
							</div>
							<USkeleton class="h-8 w-14 rounded-md" />
						</div>
					</div>
				</template>
				<template v-else>
					<div
						v-if="doing.length === 0"
						class="text-sm text-muted py-4 text-center">
						暂无进行中任务
					</div>

					<div
						v-else
						class="space-y-2">
						<div
							v-for="t in doing"
							:key="t.id"
							class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3 cursor-pointer hover:bg-default transition"
							@click="onTaskClick(t)">
							<div class="min-w-0">
								<div class="text-sm font-medium truncate">{{ t.title }}</div>
							</div>
							<UButton
								size="sm"
								label="完成"
								color="success"
								variant="subtle"
								@click.stop="onComplete(t.id)" />
						</div>
					</div>
				</template>
			</UCard>

			<!-- 待办 -->
			<UCard>
				<template #header>
					<div class="flex items-center justify-between">
						<div class="text-sm font-semibold text-default">待办</div>
						<template v-if="loading">
							<USkeleton class="h-5 w-6 rounded-full" />
						</template>
						<UBadge
							v-else
							color="neutral"
							variant="subtle"
							size="sm">
							{{ todo.length }}
						</UBadge>
					</div>
				</template>

				<template v-if="loading">
					<div class="space-y-2">
						<div
							v-for="i in 2"
							:key="i"
							class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3">
							<div class="space-y-2 flex-1">
								<USkeleton class="h-4 w-3/4" />
							</div>
							<USkeleton class="h-8 w-14 rounded-md" />
						</div>
					</div>
				</template>
				<template v-else>
					<div
						v-if="todo.length === 0"
						class="text-sm text-muted py-4 text-center">
						暂无待办任务
					</div>

					<div
						v-else
						class="space-y-2">
						<div
							v-for="t in todo"
							:key="t.id"
							class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3 cursor-pointer hover:bg-default transition"
							@click="onTaskClick(t)">
							<div class="min-w-0">
								<div class="text-sm font-medium truncate">{{ t.title }}</div>
							</div>
							<UButton
								size="sm"
								label="完成"
								color="success"
								variant="subtle"
								@click.stop="onComplete(t.id)" />
						</div>
					</div>
				</template>
			</UCard>

			<!-- 已完成 -->
			<UCard>
				<template #header>
					<div class="flex items-center justify-between">
						<div class="text-sm font-semibold text-default">已完成（今天）</div>
						<template v-if="loading">
							<USkeleton class="h-5 w-6 rounded-full" />
						</template>
						<UBadge
							v-else
							color="neutral"
							variant="subtle"
							size="sm">
							{{ doneToday.length }}
						</UBadge>
					</div>
				</template>

				<template v-if="loading">
					<div class="space-y-2">
						<div
							v-for="i in 2"
							:key="i"
							class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3">
							<div class="space-y-2 flex-1">
								<USkeleton class="h-4 w-3/4" />
							</div>
							<USkeleton class="h-3 w-12" />
						</div>
					</div>
				</template>
				<template v-else>
					<div
						v-if="doneToday.length === 0"
						class="text-sm text-muted py-4 text-center">
						今天还没有完成记录
					</div>

					<div
						v-else
						class="space-y-2">
						<div
							v-for="t in doneToday"
							:key="t.id"
							class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3 cursor-pointer hover:bg-default transition"
							@click="onTaskClick(t)">
							<div class="min-w-0">
								<div class="text-sm font-medium truncate">{{ t.title }}</div>
							</div>
							<div class="text-xs text-muted shrink-0">
								{{ new Date(t.completed_at ?? 0).toLocaleTimeString() }}
							</div>
						</div>
					</div>
				</template>
			</UCard>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { onMounted, ref } from 'vue'

	import { completeTask, listTasks, type TaskDto } from '@/services/api/tasks'

	const SPACE_ID = 'work'

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

	async function refresh() {
		loading.value = true
		try {
			const [doingRows, todoRows, doneRows] = await Promise.all([
				listTasks({ spaceId: SPACE_ID, status: 'doing' }),
				listTasks({ spaceId: SPACE_ID, status: 'todo' }),
				listTasks({ spaceId: SPACE_ID, status: 'done' }),
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
