<template>
	<div class="space-y-3">
		<div class="text-sm font-semibold text-default">Space 概览</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<UCard
				as="a"
				href="#/space/work"
				class="hover:bg-elevated transition cursor-pointer">
				<div class="flex items-center gap-2 mb-2">
					<UIcon
						name="i-lucide-briefcase"
						class="text-blue-500" />
					<span class="font-medium">Work</span>
				</div>
				<template v-if="loading">
					<USkeleton class="h-5 w-20" />
				</template>
				<div
					v-else
					class="text-sm text-muted">
					{{ spaceStats.work }} 个任务
				</div>
			</UCard>

			<UCard
				as="a"
				href="#/space/personal"
				class="hover:bg-elevated transition cursor-pointer">
				<div class="flex items-center gap-2 mb-2">
					<UIcon
						name="i-lucide-user"
						class="text-purple-500" />
					<span class="font-medium">Personal</span>
				</div>
				<template v-if="loading">
					<USkeleton class="h-5 w-20" />
				</template>
				<div
					v-else
					class="text-sm text-muted">
					{{ spaceStats.personal }} 个任务
				</div>
			</UCard>

			<UCard
				as="a"
				href="#/space/study"
				class="hover:bg-elevated transition cursor-pointer">
				<div class="flex items-center gap-2 mb-2">
					<UIcon
						name="i-lucide-book-open"
						class="text-green-500" />
					<span class="font-medium">Study</span>
				</div>
				<template v-if="loading">
					<USkeleton class="h-5 w-20" />
				</template>
				<div
					v-else
					class="text-sm text-muted">
					{{ spaceStats.study }} 个任务
				</div>
			</UCard>
		</div>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		spaceStats: { work: number; personal: number; study: number }
		loading: boolean
	}>()
</script>
