<template>
	<section class="space-y-2">
		<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Note</label>
		<div class="p-4 rounded-2xl border bg-elevated/50 border-default/60 hover:bg-elevated/80 transition-all">
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
				@focus="onNoteFocus"
				@compositionstart="onNoteCompositionStart"
				@compositionend="onNoteCompositionEnd"
				@blur="onNoteBlur" />
		</div>
	</section>
</template>

<script setup lang="ts">
	const noteModel = defineModel<string>('note', { required: true })

	type Props = {
		onNoteBlur: () => void
		onNoteFocus: () => void
		onNoteCompositionStart: () => void
		onNoteCompositionEnd: () => void
	}

	defineProps<Props>()
</script>
