<template>
	<section class="space-y-2">
		<!-- <label class="text-[10px] font-semibold text-muted uppercase tracking-widest">状态</label> -->
		<UTabs
			:items="statusTabItems"
			:model-value="props.statusLocal"
			:content="false"
			color="neutral"
			variant="pill"
			size="sm"
			:ui="segmentTabsUi"
			@update:model-value="onStatusTabChange">
			<template #leading="{ item }">
				<UIcon
					:name="item.icon"
					class="size-3.5"
					:class="props.statusLocal === item.value ? item.iconClass : 'text-muted'" />
			</template>
		</UTabs>
	</section>

	<section
		v-if="props.statusLocal === 'done'"
		class="space-y-2">
		<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">完成类型</label>
		<UTabs
			:items="doneReasonTabItems"
			:model-value="props.doneReasonLocal"
			:content="false"
			color="neutral"
			variant="pill"
			size="sm"
			:ui="segmentTabsUi"
			@update:model-value="onDoneReasonTabChange">
			<template #leading="{ item }">
				<UIcon
					:name="item.icon"
					class="size-3.5"
					:class="props.doneReasonLocal === item.value ? item.iconClass : 'text-muted'" />
			</template>
		</UTabs>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import type { DoneReasonOption, StatusSegmentOption, TaskDoneReasonValue, TaskStatusValue } from '@/config/task'

	type Props = {
		statusLocal: TaskStatusValue
		doneReasonLocal: TaskDoneReasonValue
		statusOptions: StatusSegmentOption[]
		doneReasonOptions: DoneReasonOption[]
		onStatusSegmentClick: (value: TaskStatusValue) => void
		onDoneReasonChange: (value: TaskDoneReasonValue) => void
	}

	const props = defineProps<Props>()

	const segmentTabsUi = {
		root: 'w-full',
		list: 'w-full rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'flex-1 rounded-full px-3.5 py-2 text-[11px] font-semibold data-[state=active]:text-default data-[state=inactive]:text-muted hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default hover:data-[state=inactive]:shadow-sm',
		leadingIcon: 'size-3.5',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}

	const statusTabItems = computed(() =>
		props.statusOptions.map((opt) => ({
			label: opt.label,
			value: opt.value,
			icon: opt.icon,
			iconClass: opt.iconClass,
		})),
	)

	const doneReasonTabItems = computed(() =>
		props.doneReasonOptions.map((opt) => ({
			label: opt.label,
			value: opt.value,
			icon: opt.icon,
			iconClass: opt.iconClass,
		})),
	)

	function onStatusTabChange(value: string | number) {
		if (typeof value !== 'string') return
		const selected = props.statusOptions.find((opt) => opt.value === value)
		if (!selected) return
		props.onStatusSegmentClick(selected.value)
	}

	function onDoneReasonTabChange(value: string | number) {
		if (typeof value !== 'string') return
		const selected = props.doneReasonOptions.find((opt) => opt.value === value)
		if (!selected) return
		props.onDoneReasonChange(selected.value)
	}
</script>
