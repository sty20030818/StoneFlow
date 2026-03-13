<template>
	<div
		v-if="visible"
		v-motion="motion"
		class="pointer-events-none absolute inset-x-0 top-full -mt-px z-layer-header-edit-strip">
		<div class="pointer-events-auto mt-0">
			<button
				type="button"
				class="inline-flex h-12 w-full items-center justify-center gap-2 bg-linear-to-b from-error/95 to-error/10 px-5 text-sm font-semibold text-white transition-[background,opacity] hover:from-error/95 hover:to-error/55 disabled:cursor-not-allowed disabled:opacity-60"
				:class="glowClass"
				:disabled="selectedCount === 0"
				@click="$emit('openDeleteConfirm')">
				<UIcon
					name="i-lucide-trash-2"
					class="size-4" />
				<span>{{ label }}</span>
				<span class="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
					{{ selectedCount }}
				</span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		visible: boolean
		selectedCount: number
		motion: Record<string, unknown>
		glowClass: string
		label: string
	}>()

	defineEmits<{
		openDeleteConfirm: []
	}>()
</script>
