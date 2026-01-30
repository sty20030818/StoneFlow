<template>
	<section class="space-y-3">
		<button
			type="button"
			class="flex items-center justify-between w-full"
			@click="toggleTimeline">
			<div class="flex items-center gap-2">
				<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">时间线</label>
				<UBadge
					size="xs"
					color="neutral"
					variant="soft">
					{{ timelineItems.length }}
				</UBadge>
			</div>
			<UIcon
				name="i-lucide-chevron-down"
				class="size-4 text-muted transition-transform duration-200"
				:class="timelineCollapsed ? '' : 'rotate-180'" />
		</button>
		<div v-show="!timelineCollapsed">
			<UTimeline :items="timelineItems" />
		</div>
	</section>
</template>

<script setup lang="ts">
	type TimelineItem = {
		label: string
		content: string
		icon: string
	}

	type Props = {
		timelineItems: TimelineItem[]
		timelineCollapsed: boolean
		toggleTimeline: () => void
	}

	defineProps<Props>()
</script>
