<template>
	<section>
		<div class="mb-2 flex items-center justify-between">
			<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">属性</label>
			<button
				type="button"
				class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-default/60 bg-elevated/60 text-sm font-semibold text-muted transition-colors hover:bg-elevated"
				aria-label="新增自定义字段"
				@click="onAddCustomField">
				+
			</button>
		</div>
			<div class="grid grid-cols-2 gap-3">
				<UPopover
					v-model:open="priorityPopoverOpen"
					:mode="'click'"
					:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
					:ui="drawerPopoverUi">
				<button
					type="button"
					class="p-4 rounded-2xl border transition-all text-left w-full cursor-pointer"
					:class="priorityCardClass">
					<div class="flex items-center gap-2.5">
						<UIcon
							:name="priorityIcon"
							class="size-4 shrink-0"
							:class="priorityIconClass" />
						<div class="min-w-0 flex-1">
							<div class="text-[11px] text-muted mb-1">Priority</div>
							<div
								class="text-xs font-semibold"
								:class="priorityTextClass">
								{{ priorityLabel }}
							</div>
						</div>
					</div>
				</button>
				<template #content>
					<div class="p-2 min-w-[200px]">
						<div
							v-for="opt in priorityOptions"
							:key="opt.value"
							class="px-3 py-2 rounded-lg hover:bg-elevated cursor-pointer transition-colors"
							:class="{
								'bg-elevated': priority === opt.value,
							}"
							@click="onPriorityChange(opt.value)">
							<div class="flex items-center gap-2">
								<UIcon
									:name="opt.icon"
									class="size-4 shrink-0"
									:class="opt.iconClass" />
								<span class="text-sm">{{ opt.label }}</span>
							</div>
						</div>
					</div>
				</template>
			</UPopover>

				<UPopover
					v-model:open="deadlinePopoverOpen"
					:mode="'click'"
					:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
					:ui="drawerPopoverUi">
				<button
					type="button"
					class="p-4 rounded-2xl border transition-all text-left w-full cursor-pointer"
					:class="
						deadline
							? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/60'
							: 'bg-elevated/50 border-default/60 hover:bg-elevated/80'
					">
					<div class="flex items-center gap-2.5">
						<UIcon
							name="i-lucide-alarm-clock"
							class="size-4 shrink-0"
							:class="deadline ? 'text-indigo-500' : 'text-muted'" />
						<div class="min-w-0 flex-1">
							<div class="text-[11px] text-muted mb-1">DeadLine</div>
							<div
								class="text-xs font-semibold"
								:class="deadline ? 'text-indigo-600' : 'text-muted'">
								{{ deadlineLabel }}
							</div>
						</div>
					</div>
				</button>
				<template #content>
						<div class="p-2">
							<UInput
								v-model="deadline"
								type="date"
								size="sm"
								:ui="{ rounded: 'rounded-lg' }"
								@change="onDeadlineSelected" />
							<div class="mt-2 flex gap-2">
								<UButton
									color="neutral"
								variant="ghost"
								size="xs"
								@click="onDeadlineClear">
								清除
							</UButton>
						</div>
					</div>
				</template>
			</UPopover>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { ref } from 'vue'

	import type { PriorityOption, TaskPriorityValue } from '@/config/task'
	import { createDrawerPopoverLayerUi } from '@/config/ui-layer'

	// 使用 defineModel 实现双向绑定
	const priority = defineModel<TaskPriorityValue>('priority', { required: true })
	const deadline = defineModel<string>('deadline', { required: true })
	const drawerPopoverUi = createDrawerPopoverLayerUi()
	const priorityPopoverOpen = ref(false)
	const deadlinePopoverOpen = ref(false)

	type Props = {
		priorityIcon: string
		priorityLabel: string
		priorityOptions: PriorityOption[]
		priorityCardClass: string
		priorityIconClass: string
		priorityTextClass: string
		deadlineLabel: string
		onAddCustomField: () => void
	}

	defineProps<Props>()

	// 事件处理
	const onPriorityChange = (value: TaskPriorityValue) => {
		priority.value = value
		priorityPopoverOpen.value = false
	}

	const onDeadlineClear = () => {
		deadline.value = ''
		deadlinePopoverOpen.value = false
	}

	const onDeadlineSelected = () => {
		deadlinePopoverOpen.value = false
	}
</script>
