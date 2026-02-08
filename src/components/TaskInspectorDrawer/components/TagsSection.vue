<template>
	<section class="space-y-2">
		<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Tags</label>
		<div class="flex flex-wrap gap-2 items-center">
			<div
				v-for="tag in tags"
				:key="tag"
				class="group relative px-3 py-1.5 bg-white rounded-lg text-xs font-bold shadow-sm border border-default/40 text-default flex items-center justify-center cursor-default hover:border-primary/50 transition-colors overflow-hidden">
				<span>#{{ tag }}</span>
				<div
					class="hidden group-hover:flex absolute inset-0 bg-white/95 items-center justify-center cursor-pointer transition-opacity"
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
	const tagInputModel = defineModel<string>('tagInput', { required: true })

	type Props = {
		tags: string[]
		onAddTag: () => void
		onRemoveTag: (tag: string) => void
		onTagInputBlur: () => void
	}

	defineProps<Props>()
</script>
