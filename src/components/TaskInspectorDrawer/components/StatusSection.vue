<template>
	<section class="space-y-2">
		<!-- <label class="text-[10px] font-semibold text-muted uppercase tracking-widest">状态</label> -->
		<div class="flex items-center gap-2.5">
			<div class="rounded-full bg-elevated/70 border border-default/80 p-1 flex gap-1 flex-1">
				<button
					v-for="opt in statusOptions"
					:key="opt.value"
					type="button"
					class="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:shadow-sm active:translate-y-px"
					:class="statusLocal === opt.value ? opt.activeClass : 'text-muted hover:text-default hover:bg-default/40'"
					@click="onStatusSegmentClick(opt.value)">
					<UIcon
						:name="opt.icon"
						class="size-3.5"
						:class="statusLocal === opt.value ? opt.iconClass : 'text-muted'" />
					<span>{{ opt.label }}</span>
				</button>
			</div>
		</div>
	</section>

	<section
		v-if="statusLocal === 'done'"
		class="space-y-2">
		<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">完成类型</label>
		<div class="rounded-full bg-elevated/70 border border-default/80 p-1 flex gap-1">
			<button
				v-for="opt in doneReasonOptions"
				:key="opt.value"
				type="button"
				class="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:shadow-sm active:translate-y-px"
				:class="doneReasonLocal === opt.value ? opt.activeClass : 'text-muted hover:text-default hover:bg-default/40'"
				@click="onDoneReasonChange(opt.value)">
				<UIcon
					:name="opt.icon"
					class="size-3.5"
					:class="doneReasonLocal === opt.value ? opt.iconClass : 'text-muted'" />
				<span>{{ opt.label }}</span>
			</button>
		</div>
	</section>
</template>

<script setup lang="ts">
	import type { DoneReasonOption, StatusSegmentOption, TaskDoneReasonValue, TaskStatusValue } from '@/config/task'

	type Props = {
		statusLocal: TaskStatusValue
		doneReasonLocal: TaskDoneReasonValue
		statusOptions: StatusSegmentOption[]
		doneReasonOptions: DoneReasonOption[]
		onStatusSegmentClick: (value: TaskStatusValue) => void
		onDoneReasonChange: (value: TaskDoneReasonValue) => void
	}

	defineProps<Props>()
</script>
