<template>
	<section class="space-y-2">
		<label class="text-xs font-semibold text-muted uppercase tracking-widest">Tags</label>
		<div class="flex flex-wrap gap-2 items-center">
			<div
				v-for="tag in tags"
				:key="tag"
				v-motion="tagHoverMotion"
				class="group relative flex cursor-default items-center justify-center overflow-hidden rounded-lg border border-default/40 bg-default px-3 py-1.5 text-xs font-bold text-default shadow-sm transition-colors hover:border-primary/50 dark:shadow-[0_12px_24px_-18px_rgba(0,0,0,0.6)]">
				<span>#{{ tag }}</span>
				<div
					class="absolute inset-0 hidden cursor-pointer items-center justify-center bg-white/95 transition-opacity group-hover:flex dark:bg-neutral-900/92"
					@click="onRemoveTag(tag)">
					<UIcon
						name="i-lucide-x"
						class="size-3 text-red-500" />
				</div>
			</div>

			<div class="flex items-center">
				<input
					v-model="tagInputModel"
					type="text"
					placeholder="+ New Tag"
					class="bg-transparent border-none text-xs font-medium placeholder:text-muted/60 focus:ring-0 focus:outline-none w-[100px] h-8 px-2"
					@keydown.enter.prevent="onAddTag"
					@blur="onTagInputBlur" />
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useCardHoverMotionPreset } from '@/shared/composables/base/motion'

	const tagInputModel = defineModel<string>('tagInput', { required: true })
	const tagHoverMotion = useCardHoverMotionPreset()

	type Props = {
		tags: string[]
		onAddTag: () => void
		onRemoveTag: (tag: string) => void
		onTagInputBlur: () => void
	}

	defineProps<Props>()
</script>
