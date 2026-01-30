<template>
	<div
		class="relative flex items-center gap-4 p-4 bg-elevated rounded-2xl border border-transparent hover:border-default/80 transition-colors opacity-70 hover:opacity-100"
		:class="isEditMode && selected ? 'border-error/60 bg-error/5 opacity-100 shadow-sm' : ''"
		@click="onCardClick">
		<div
			v-if="isEditMode && selected"
			class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-error/10"></div>
		<div class="shrink-0">
			<button
				v-if="isEditMode"
				type="button"
				class="size-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
				:class="selectRingClass"
				@click.stop="onToggleSelect">
				<UIcon
					v-if="selected"
					name="i-lucide-x"
					class="size-3.5" />
			</button>
			<div
				v-else
				class="w-6 h-6 flex items-center justify-center rounded-full"
				:class="doneReasonStyle.ringClass">
				<UIcon
					:name="doneReasonStyle.icon"
					class="size-3" />
			</div>
		</div>
		<div class="flex items-center gap-2 min-w-0 flex-1">
			<span class="text-muted font-medium line-through">{{ task.title }}</span>
			<UBadge
				v-if="isCancelled"
				size="xs"
				color="error"
				variant="soft">
				{{ doneReasonStyle.badgeLabel }}
			</UBadge>
		</div>
		<div class="ml-auto flex items-center gap-2 shrink-0">
			<button
				v-if="isEditMode"
				type="button"
				class="inline-flex size-8 items-center justify-center rounded-full text-error transition-colors hover:bg-error/10"
				@click.stop="onRequestDelete">
				<UIcon
					name="i-lucide-trash-2"
					class="size-4" />
			</button>
			<div
				v-if="(task.links?.length ?? 0) > 0"
				class="flex items-center gap-1 text-[10px] text-muted">
				<UIcon
					name="i-lucide-link-2"
					class="size-3" />
				<span class="font-medium">{{ task.links.length }}</span>
			</div>
			<TimeDisplay
				v-if="showTime && task.completed_at"
				:timestamp="task.completed_at"
				text-class="text-xs text-muted" />
		</div>
	</div>
</template>

<script setup lang="ts">
	import TimeDisplay from '@/components/TimeDisplay.vue'
	import type { TaskDto } from '@/services/api/tasks'

	defineProps<{
		task: TaskDto
		isEditMode?: boolean
		selected?: boolean
		isCancelled: boolean
		showTime?: boolean
		doneReasonStyle: {
			ringClass: string
			icon: string
			badgeLabel: string
		}
		selectRingClass: string
		onToggleSelect: () => void
		onCardClick: () => void
		onRequestDelete: () => void
	}>()
</script>
