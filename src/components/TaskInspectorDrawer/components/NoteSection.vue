<template>
	<section class="space-y-2">
		<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Note</label>
		<div
			v-motion="noteCardHoverMotion"
			class="p-4 rounded-2xl border bg-elevated/50 border-default/60 hover:bg-elevated/80 transition-colors">
			<UTextarea
				v-model="noteModel"
				placeholder="记录一些背景信息、想法或链接…"
				:rows="6"
				size="sm"
				autoresize
				variant="none"
				:ui="{
					root: 'w-full',
					base: 'p-0 text-sm leading-relaxed bg-transparent border-none rounded-none focus:ring-0 placeholder:text-muted/40',
				}"
				@focus="props.interaction.onFocus"
				@compositionstart="props.interaction.onCompositionStart"
				@compositionend="props.interaction.onCompositionEnd"
				@blur="props.interaction.onBlur" />
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useCardHoverMotionPreset } from '@/composables/base/motion'

	const noteModel = defineModel<string>('note', { required: true })
	const noteCardHoverMotion = useCardHoverMotionPreset()

	type TextInteractionHandlers = {
		onFocus: () => void
		onBlur: () => void
		onCompositionStart: () => void
		onCompositionEnd: () => void
	}

	type Props = {
		interaction: TextInteractionHandlers
	}

	const props = defineProps<Props>()
</script>
