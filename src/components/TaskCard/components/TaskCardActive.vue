<template>
	<div
		class="relative bg-default rounded-2xl p-4 border border-default/70 hover:border-default/90 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex gap-4 items-start"
		:class="isEditMode && selected ? 'border-error/60 hover:border-error/70 bg-error/5 shadow-sm' : ''"
		@click="onCardClick">
		<div
			v-if="isEditMode && selected"
			class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-error/10"></div>
		<div class="mt-1">
			<button
				v-if="isEditMode"
				type="button"
				class="size-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
				:class="selectRingClass"
				@click.stop="onToggleSelect">
				<UIcon
					v-if="selected"
					name="i-lucide-x"
					class="size-3.5" />
			</button>
			<div
				v-else
				@click.stop="onComplete"
				class="size-6 rounded-full border-2 border-blue-500/70 hover:border-blue-500 transition-colors shrink-0 cursor-pointer"></div>
		</div>

		<div class="flex-1 min-w-0">
			<div class="flex justify-between items-start">
				<span class="font-bold text-default text-base group-hover:text-default transition-colors">
					{{ task.title }}
				</span>
				<div class="flex items-center gap-2 shrink-0">
					<PriorityBadge
						:priority="task.priority"
						variant="todo" />
					<button
						v-if="isEditMode"
						type="button"
						class="inline-flex size-8 items-center justify-center rounded-full text-error transition-colors hover:bg-error/10"
						@click.stop="onRequestDelete">
						<UIcon
							name="i-lucide-trash-2"
							class="size-4" />
					</button>
				</div>
			</div>

			<p
				v-if="task.note"
				class="text-xs text-muted mt-1 line-clamp-1">
				{{ task.note }}
			</p>

			<div
				v-if="showSpaceLabel || task.tags.length > 0 || task.deadline_at || (task.links?.length ?? 0) > 0"
				class="flex items-center gap-2 mt-3">
				<SpaceLabel
					v-if="showSpaceLabel"
					:space-id="task.space_id" />
				<span
					v-for="tag in task.tags"
					:key="tag"
					class="text-[10px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded">
					#{{ tag }}
				</span>
				<div
					v-if="task.deadline_at"
					class="flex items-center gap-1 text-blue-600 text-[10px]">
					<UIcon
						name="i-lucide-calendar"
						class="size-3" />
					<span class="font-medium">
						{{ formatDueDate(task.deadline_at) }}
					</span>
				</div>
				<div
					v-if="(task.links?.length ?? 0) > 0"
					class="flex items-center gap-1 text-[10px] text-muted">
					<UIcon
						name="i-lucide-link-2"
						class="size-3" />
					<span class="font-medium">{{ task.links.length }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import PriorityBadge from '@/components/PriorityBadge.vue'
	import SpaceLabel from '@/components/SpaceLabel.vue'
	import type { TaskDto } from '@/services/api/tasks'

	defineProps<{
		task: TaskDto
		showSpaceLabel?: boolean
		isEditMode?: boolean
		selected?: boolean
		selectRingClass: string
		onToggleSelect: () => void
		onCardClick: () => void
		onRequestDelete: () => void
		onComplete: () => void
		formatDueDate: (timestamp: number) => string
	}>()
</script>
