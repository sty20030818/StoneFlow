<template>
	<UPopover
		mode="hover"
		:open="open"
		:content="popoverContent"
		:ui="popoverUi"
		@update:open="onOpenChange">
		<div
			class="no-drag inline-flex items-center gap-1 rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400"
			:aria-label="`${label} ${count}`">
			<UIcon
				:name="icon"
				class="size-3" />
			<span class="font-medium">{{ count }}</span>
		</div>

		<template #content>
			<div class="w-64 max-h-56 overflow-y-auto rounded-lg border border-default/60 bg-default p-2 shadow-lg">
				<ul class="space-y-1.5">
					<li
						v-for="(item, index) in items"
						:key="`${item.title}-${index}`"
						class="rounded-md border border-default/40 bg-elevated/40 px-2 py-1.5">
						<div class="truncate text-[11px] font-semibold text-default">
							{{ item.title }}
						</div>
						<div class="break-all text-[10px] text-muted">
							{{ item.value }}
						</div>
					</li>
				</ul>
			</div>
		</template>
	</UPopover>
</template>

<script setup lang="ts">
	import { createPopoverLayerUi } from '@/config/ui-layer'
	import { useDebounceFn } from '@vueuse/core'
	import { ref } from 'vue'

	import type { TaskCardMetaItem } from '../composables/useTaskCardMetadataBadges'

	type Props = {
		icon: string
		label: string
		count: number
		items: TaskCardMetaItem[]
	}

	defineProps<Props>()

	const popoverUi = createPopoverLayerUi()
	const popoverContent = {
		side: 'left' as const,
		align: 'center' as const,
		sideOffset: 8,
		collisionPadding: 8,
		avoidCollisions: false,
	}
	const open = ref(false)
	const hovering = ref(false)
	const closeDebounced = useDebounceFn(() => {
		if (hovering.value) return
		open.value = false
	}, 120)

	function onOpenChange(nextOpen: boolean) {
		if (nextOpen) {
			hovering.value = true
			open.value = true
			return
		}
		hovering.value = false
		closeDebounced()
	}
</script>
