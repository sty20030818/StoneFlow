<template>
	<section class="space-y-4">
		<UCard class="py-12">
			<div class="flex flex-col items-center justify-center gap-3">
				<UIcon
					name="i-lucide-construction"
					class="text-4xl text-muted" />
				<div class="text-sm text-muted">敬请期待</div>
			</div>
		</UCard>
	</section>
</template>

<script setup lang="ts">
	defineProps<{
		title: string
		description: string
		icon: string
		iconClass: string
	}>()
</script>
