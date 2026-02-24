<template>
	<section class="space-y-2">
		<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">备注</label>
		<div
			class="rounded-2xl border-2 border-default/70 bg-elevated/50 p-4 transition-[border-color] duration-150 hover:border-emerald-200 focus-within:border-emerald-300 hover:focus-within:border-emerald-300">
			<UTextarea
				v-model="noteModel"
				:placeholder="placeholder"
				:rows="rows"
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
	import type { DrawerTextInteractionHandlers } from '../types'

	const noteModel = defineModel<string>('note', { required: true })

	type Props = {
		interaction: DrawerTextInteractionHandlers
		placeholder?: string
		rows?: number
	}

	const props = withDefaults(defineProps<Props>(), {
		placeholder: '记录一些背景信息、想法或链接…',
		rows: 6,
	})
</script>
