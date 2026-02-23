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
			<div v-motion="optionCardHoverMotion">
				<DrawerAttributePopoverCard
					v-model:open="priorityPopoverOpen"
					:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
					:ui="drawerPopoverUi"
					:trigger-class="`${priorityCardClass} cursor-pointer`">
					<template #trigger>
						<DrawerAttributeCardShell
							:icon-name="priorityIcon"
							:icon-class="priorityIconClass"
							label="Priority"
							:value="priorityLabel"
							:value-class="priorityTextClass" />
					</template>
					<DrawerAttributeOptionList
						:items="priorityOptionItems"
						@select="onPrioritySelect" />
				</DrawerAttributePopoverCard>
			</div>

			<div v-motion="optionCardHoverMotion">
				<DrawerAttributePopoverCard
					v-model:open="deadlinePopoverOpen"
					:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
					:ui="drawerPopoverUi"
					:trigger-class="`${deadlineCardClass} cursor-pointer`">
					<template #trigger>
						<DrawerAttributeCardShell
							icon-name="i-lucide-alarm-clock"
							:icon-class="deadlineIconClass"
							label="DeadLine"
							:value="deadlineLabel"
							:value-class="deadlineValueClass" />
					</template>
					<div class="p-2">
						<DatePickerInput
							v-model="deadline"
							size="sm"
							button-size="xs"
							:popover-ui="drawerPopoverUi"
							@selected="onDeadlineSelected" />
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
				</DrawerAttributePopoverCard>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'

	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import DrawerAttributeCardShell from '@/components/DrawerAttributeCard/DrawerAttributeCardShell.vue'
	import DrawerAttributeOptionList, {
		type DrawerAttributeOptionItem,
	} from '@/components/DrawerAttributeCard/DrawerAttributeOptionList.vue'
	import DrawerAttributePopoverCard from '@/components/DrawerAttributeCard/DrawerAttributePopoverCard.vue'
	import DatePickerInput from '@/components/DatePickerInput.vue'
	import type { PriorityOption, TaskPriorityValue } from '@/config/task'
	import { createDrawerPopoverLayerUi } from '@/config/ui-layer'

	// 使用 defineModel 实现双向绑定
	const priority = defineModel<TaskPriorityValue>('priority', { required: true })
	const deadline = defineModel<string>('deadline', { required: true })
	const drawerPopoverUi = createDrawerPopoverLayerUi()
	const priorityPopoverOpen = ref(false)
	const deadlinePopoverOpen = ref(false)
	const optionCardHoverMotion = useCardHoverMotionPreset()

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

	const props = defineProps<Props>()

	const priorityOptionItems = computed<DrawerAttributeOptionItem[]>(() => {
		return props.priorityOptions.map((option) => ({
			value: option.value,
			label: option.label,
			icon: option.icon,
			iconClass: option.iconClass,
			active: priority.value === option.value,
		}))
	})

	const deadlineCardClass = computed(() => {
		return deadline.value
			? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/60'
			: 'bg-elevated/50 border-default/60 hover:bg-elevated/80'
	})

	const deadlineIconClass = computed(() => {
		return deadline.value ? 'text-indigo-500' : 'text-muted'
	})

	const deadlineValueClass = computed(() => {
		return deadline.value ? 'text-indigo-600' : 'text-muted'
	})

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

	const onPrioritySelect = (value: string | number | boolean | null) => {
		if (typeof value !== 'string') return
		onPriorityChange(value as TaskPriorityValue)
	}
</script>
