<template>
	<UPopover
		v-model:open="openModel"
		:mode="mode"
		:popper="popper"
		:ui="ui">
		<button
			ref="triggerRef"
			type="button"
			class="w-full rounded-2xl border p-4 text-left transition-colors"
			:class="triggerClass"
			:disabled="disabled">
			<slot name="trigger"></slot>
		</button>
		<template #content>
			<div
				:style="contentStyle"
				:class="contentClass">
				<slot></slot>
			</div>
		</template>
	</UPopover>
</template>

<script setup lang="ts">
	import { useEventListener, useResizeObserver } from '@vueuse/core'
	import { computed, nextTick, ref, watch } from 'vue'

	type PopoverCardPopper = Record<string, unknown>
	type PopoverCardUi = Record<string, string | undefined>

	type Props = {
		mode?: 'click' | 'hover'
		popper?: PopoverCardPopper
		ui?: PopoverCardUi
		disabled?: boolean
		triggerClass?: string
		contentClass?: string
	}

	const props = withDefaults(defineProps<Props>(), {
		mode: 'click',
		popper: () => ({
			strategy: 'fixed',
		}),
		ui: () => ({}),
		disabled: false,
		triggerClass: 'cursor-pointer',
		contentClass: '',
	})

	const openModel = defineModel<boolean>('open', { default: false })
	const triggerRef = ref<HTMLElement | null>(null)
	const triggerWidth = ref<number>(0)

	function syncTriggerWidth() {
		const width = triggerRef.value?.getBoundingClientRect().width ?? 0
		if (width <= 0) return
		triggerWidth.value = Math.ceil(width)
	}

	useResizeObserver(triggerRef, () => {
		syncTriggerWidth()
	})

	useEventListener(window, 'resize', () => {
		syncTriggerWidth()
	})

	watch(
		() => openModel.value,
		async (open) => {
			if (!open) return
			await nextTick()
			syncTriggerWidth()
		},
	)

	const contentStyle = computed<Record<string, string> | undefined>(() => {
		if (!triggerWidth.value) return undefined
		const width = `${triggerWidth.value}px`
		return {
			width,
			minWidth: width,
		}
	})
</script>
