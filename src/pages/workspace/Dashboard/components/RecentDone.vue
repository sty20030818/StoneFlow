<template>
	<div class="space-y-3">
		<div class="text-sm font-semibold text-default">最近完成</div>
		<template v-if="loading">
			<UCard class="space-y-3">
				<div
					v-for="i in 3"
					:key="i"
					class="flex items-center justify-between gap-3 py-2">
					<div class="space-y-2">
						<USkeleton class="h-4 w-48" />
						<USkeleton class="h-3 w-20" />
					</div>
					<USkeleton class="h-3 w-16" />
				</div>
			</UCard>
		</template>
		<template v-else>
			<div
				v-if="tasks.length === 0"
				class="text-sm text-muted">
				暂无完成记录
			</div>
			<UCard
				v-else
				class="space-y-2">
				<div
					v-for="t in tasks"
					:key="t.id"
					class="flex items-center justify-between gap-3 py-2 border-b border-default last:border-0">
					<div class="min-w-0">
						<div class="text-sm font-medium truncate">{{ t.title }}</div>
						<div class="text-xs text-muted">{{ spaceLabel(t.space_id) }}</div>
					</div>
					<div class="text-xs text-muted shrink-0">
						{{ timeAgo(t.completed_at) }}
					</div>
				</div>
			</UCard>
		</template>
	</div>
</template>

<script setup lang="ts">
	import type { TaskDto } from '@/services/api/tasks'

	defineProps<{
		tasks: TaskDto[]
		loading: boolean
		spaceLabel: (spaceId: string) => string
		timeAgo: (ts: number | null) => string
	}>()
</script>
