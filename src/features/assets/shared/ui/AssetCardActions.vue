<template>
	<div class="asset-card-actions">
		<UButton
			v-if="showFavorite"
			color="neutral"
			variant="ghost"
			size="xs"
			:icon="favorite ? 'i-lucide-star' : 'i-lucide-star-off'"
			:class="favorite ? 'asset-card-actions__btn--favorite' : ''"
			@click.stop="emit('favorite')">
			<span class="sr-only">{{ favorite ? '取消收藏' : '收藏' }}</span>
		</UButton>

		<UButton
			v-if="showReveal"
			color="neutral"
			variant="ghost"
			size="xs"
			:icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
			@click.stop="emit('reveal')">
			<span class="sr-only">{{ revealed ? '隐藏' : '查看' }}</span>
		</UButton>

		<UButton
			v-if="showCopy"
			color="neutral"
			variant="ghost"
			size="xs"
			icon="i-lucide-copy"
			@click.stop="emit('copy')">
			<span class="sr-only">复制</span>
		</UButton>
	</div>
</template>

<script setup lang="ts">
	type Props = {
		favorite?: boolean
		revealed?: boolean
		showFavorite?: boolean
		showReveal?: boolean
		showCopy?: boolean
	}

	withDefaults(defineProps<Props>(), {
		favorite: false,
		revealed: false,
		showFavorite: true,
		showReveal: false,
		showCopy: true,
	})

	const emit = defineEmits<{
		favorite: []
		reveal: []
		copy: []
	}>()
</script>

<style scoped>
	.asset-card-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0.15rem;
		border-radius: 999px;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.88), rgb(241 245 249 / 0.72)),
			radial-gradient(circle at top, rgb(125 211 252 / 0.28), transparent 65%);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.8),
			0 8px 18px rgb(15 23 42 / 0.08);
		backdrop-filter: blur(10px);
	}

	.asset-card-actions__btn--favorite :deep(.iconify) {
		color: rgb(234 179 8);
	}
</style>
