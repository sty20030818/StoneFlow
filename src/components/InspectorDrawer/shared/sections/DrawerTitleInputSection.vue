<template>
	<section class="space-y-2">
		<UInput
			v-model="titleModel"
			:disabled="disabled"
			:placeholder="placeholder"
			:size="size"
			variant="none"
			:ui="inputUi"
			:autofocus="autofocus"
			@focus="onFocus"
			@blur="onBlur"
			@compositionstart="onCompositionStart"
			@compositionend="onCompositionEnd" />
		<p
			v-if="helperText"
			class="text-[11px] text-muted">
			{{ helperText }}
		</p>
	</section>
</template>

<script setup lang="ts">
	const titleModel = defineModel<string>('title', { required: true })

	type Props = {
		disabled?: boolean
		placeholder?: string
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
		autofocus?: boolean
		helperText?: string
		onFocus?: () => void
		onBlur?: () => void | Promise<void>
		onCompositionStart?: () => void
		onCompositionEnd?: () => void
	}

	const props = withDefaults(defineProps<Props>(), {
		disabled: false,
		placeholder: '',
		size: 'xl',
		autofocus: false,
		helperText: '',
		onFocus: undefined,
		onBlur: undefined,
		onCompositionStart: undefined,
		onCompositionEnd: undefined,
	})

	const inputUi = {
		root: 'w-full',
		base: 'px-0 py-0 text-2xl font-semibold leading-tight bg-transparent border-none rounded-none focus:ring-0 placeholder:text-muted/40',
	}

	function onFocus() {
		props.onFocus?.()
	}

	function onBlur() {
		void props.onBlur?.()
	}

	function onCompositionStart() {
		props.onCompositionStart?.()
	}

	function onCompositionEnd() {
		props.onCompositionEnd?.()
	}
</script>
