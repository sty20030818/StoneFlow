<template>
	<section class="space-y-4">
		<!-- 顶部：面包屑 + 视图切换 + 操作区 -->
		<header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="flex items-center gap-2 min-w-0">
				<UBreadcrumb :items="breadcrumbItems" />
			</div>

			<div class="flex flex-wrap items-center gap-2 justify-end">
				<div class="inline-flex items-center gap-1.5 rounded-full bg-elevated/70 px-1 py-1 border border-default/70">
					<button
						v-for="mode in viewModes"
						:key="mode.value"
						type="button"
						class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-all"
						:class="viewMode === mode.value ? 'bg-default text-default shadow-sm' : 'text-muted hover:text-default hover:bg-default/40' "
						@click="$emit('update:viewMode', mode.value as 'list' | 'board')">
						<UIcon
							:name="mode.icon"
							class="size-3.5" />
						<span>{{ mode.label }}</span>
					</button>
				</div>

				<div class="flex items-center gap-1.5">
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-filter">
						<span class="ml-1 text-[11px]">Filter</span>
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-arrow-up-down">
						<span class="ml-1 text-[11px]">Sort</span>
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-layers-3">
						<span class="ml-1 text-[11px]">Group</span>
					</UButton>
				</div>
			</div>
		</header>

		<!-- 三段式任务区域 -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<slot name="in-progress" />
			<slot name="todo" />
			<slot name="done" />
		</div>
	</section>
</template>

<script setup lang="ts">
	defineProps<{
		breadcrumbItems: { label: string; to?: string }[]
		viewMode: 'list' | 'board'
	}>()

	defineEmits<{
		'update:viewMode': ['list' | 'board']
	}>()

	const viewModes = [
		{ value: 'list', label: 'List', icon: 'i-lucide-list-tree' },
		{ value: 'board', label: 'Board', icon: 'i-lucide-layout-dashboard' },
	]
</script>

