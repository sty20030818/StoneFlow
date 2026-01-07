<template>
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<UCard>
			<div class="flex items-center gap-2 text-sm text-muted mb-2">
				<UIcon
					name="i-lucide-loader"
					class="text-blue-500" />
				<span>进行中</span>
			</div>
			<template v-if="loading">
				<USkeleton class="h-9 w-12" />
			</template>
			<div
				v-else
				class="text-3xl font-bold">
				{{ stats.doing }}
			</div>
		</UCard>

		<UCard>
			<div class="flex items-center gap-2 text-sm text-muted mb-2">
				<UIcon
					name="i-lucide-list-todo"
					class="text-orange-500" />
				<span>待办</span>
			</div>
			<template v-if="loading">
				<USkeleton class="h-9 w-12" />
			</template>
			<div
				v-else
				class="text-3xl font-bold">
				{{ stats.todo }}
			</div>
		</UCard>

		<UCard>
			<div class="flex items-center gap-2 text-sm text-muted mb-2">
				<UIcon
					name="i-lucide-check-circle"
					class="text-green-500" />
				<span>今日完成</span>
			</div>
			<template v-if="loading">
				<USkeleton class="h-9 w-12" />
			</template>
			<div
				v-else
				class="text-3xl font-bold">
				{{ stats.doneToday }}
			</div>
		</UCard>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		stats: { doing: number; todo: number; doneToday: number }
		loading: boolean
	}>()
</script>
