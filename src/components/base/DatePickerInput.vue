<template>
	<UInputDate
		ref="inputDateRef"
		v-model="dateValue"
		:locale="locale"
		granularity="day"
		:size="size"
		:class="className"
		@update:model-value="onDateSelected">
		<template #trailing>
			<UPopover
				v-model:open="calendarOpen"
				:reference="calendarReferenceEl"
				:ui="popoverUi">
				<UButton
					color="neutral"
					variant="link"
					:size="buttonSize"
					icon="i-lucide-calendar"
					:aria-label="ariaLabel"
					class="px-0" />
				<template #content>
					<UCalendar
						v-model="dateValue"
						:locale="locale"
						class="p-2"
						@update:model-value="onDateSelected" />
				</template>
			</UPopover>
		</template>
	</UInputDate>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { parseDate, type DateValue } from '@internationalized/date'
	import { computed, ref, useTemplateRef } from 'vue'

	type DatePickerInputRef = {
		inputsRef?: Array<{ $el?: HTMLElement }>
	}

	type Props = {
		size?: 'sm' | 'md' | 'lg' | 'xl'
		buttonSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
		className?: string
		locale?: string
		ariaLabel?: string
		popoverUi?: Record<string, string | undefined>
	}

	const props = withDefaults(defineProps<Props>(), {
		size: 'md',
		buttonSize: 'sm',
		className: 'w-full',
		locale: 'en-CA',
		ariaLabel: undefined,
	})
	const { t } = useI18n({ useScope: 'global' })

	const model = defineModel<string>({ required: true })

	const emit = defineEmits<{
		selected: []
	}>()

	const inputDateRef = useTemplateRef<DatePickerInputRef>('inputDateRef')
	const calendarOpen = ref(false)

	const calendarReferenceEl = computed(() => {
		const refs = inputDateRef.value?.inputsRef
		if (!refs?.length) return undefined
		return refs[refs.length - 1]?.$el
	})
	const ariaLabel = computed(() => props.ariaLabel || t('datePicker.ariaLabel'))

	const dateValue = computed<DateValue | undefined>({
		get() {
			if (!model.value) return undefined
			try {
				return parseDate(model.value)
			} catch {
				return undefined
			}
		},
		set(value) {
			model.value = value ? value.toString() : ''
		},
	})

	const onDateSelected = () => {
		calendarOpen.value = false
		emit('selected')
	}
</script>
