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
			:ui="statusTabsUi"
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
		<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">
			{{ t('inspector.task.doneReason.label') }}
		</label>
		<UTabs
			:items="doneReasonTabItems"
			:model-value="props.doneReasonLocal"
			:content="false"
			color="neutral"
			variant="pill"
			size="sm"
			:ui="doneReasonTabsUi"
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
	import { useI18n } from 'vue-i18n'
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
	const { t } = useI18n({ useScope: 'global' })

	const segmentTabsBaseUi = {
		root: 'w-full',
		list: 'w-full rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'flex-1 rounded-full px-3.5 py-2 text-[11px] font-semibold data-[state=inactive]:text-muted hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default hover:data-[state=inactive]:shadow-sm focus:outline-none focus-visible:outline-none focus-visible:outline-offset-0 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-default/60',
		leadingIcon: 'size-3.5',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}

	const STATUS_INDICATOR_CLASS: Record<TaskStatusValue, string> = {
		todo: 'bg-blue-50 border border-blue-300',
		done: 'bg-emerald-50 border border-emerald-300',
	}

	const DONE_REASON_INDICATOR_CLASS: Record<TaskDoneReasonValue, string> = {
		completed: 'bg-emerald-50 border border-emerald-300',
		cancelled: 'bg-red-50 border border-red-300',
	}

	const STATUS_TRIGGER_ACTIVE_TEXT_CLASS: Record<TaskStatusValue, string> = {
		todo: 'data-[state=active]:text-blue-700',
		done: 'data-[state=active]:text-emerald-700',
	}

	const DONE_REASON_TRIGGER_ACTIVE_TEXT_CLASS: Record<TaskDoneReasonValue, string> = {
		completed: 'data-[state=active]:text-emerald-700',
		cancelled: 'data-[state=active]:text-red-700',
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

	const statusTabsUi = computed(() => ({
		...segmentTabsBaseUi,
		trigger: `${segmentTabsBaseUi.trigger} ${STATUS_TRIGGER_ACTIVE_TEXT_CLASS[props.statusLocal]}`,
		indicator: `rounded-full shadow-sm inset-y-1 ${STATUS_INDICATOR_CLASS[props.statusLocal]}`,
	}))

	const doneReasonTabsUi = computed(() => ({
		...segmentTabsBaseUi,
		trigger: `${segmentTabsBaseUi.trigger} ${DONE_REASON_TRIGGER_ACTIVE_TEXT_CLASS[props.doneReasonLocal]}`,
		indicator: `rounded-full shadow-sm inset-y-1 ${DONE_REASON_INDICATOR_CLASS[props.doneReasonLocal]}`,
	}))

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
