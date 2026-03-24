<template>
	<div class="asset-card-actions">
		<UButton
			v-if="showFavorite"
			color="neutral"
			variant="ghost"
			size="sm"
			:icon="favorite ? 'i-lucide-star' : 'i-lucide-star-off'"
			:class="[
				'asset-card-actions__btn',
				'asset-card-actions__btn--favorite',
				favorite ? 'asset-card-actions__btn--favorite-active' : '',
			]"
			@click.stop="emit('favorite')">
			<span class="sr-only">{{ favorite ? '取消收藏' : '收藏' }}</span>
		</UButton>

		<UButton
			v-if="showReveal"
			color="neutral"
			variant="ghost"
			size="sm"
			:icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
			class="asset-card-actions__btn asset-card-actions__btn--reveal"
			@click.stop="emit('reveal')">
			<span class="sr-only">{{ revealed ? '隐藏' : '查看' }}</span>
		</UButton>

		<UButton
			v-if="showCopy"
			color="neutral"
			variant="ghost"
			size="sm"
			icon="i-lucide-copy"
			class="asset-card-actions__btn asset-card-actions__btn--copy"
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
		gap: 0.2rem;
	}

	.asset-card-actions__btn {
		transition: transform 140ms ease;
	}

	.asset-card-actions :deep(.asset-card-actions__btn) {
		border-radius: 999px;
		color: rgb(100 116 139) !important;
		min-width: 2rem;
		min-height: 2rem;
		padding: 0.3rem !important;
		transition: color 140ms ease;
	}

	.asset-card-actions :deep(.asset-card-actions__btn .iconify) {
		color: currentColor !important;
		transition: color 140ms ease;
	}

	.asset-card-actions :deep(.asset-card-actions__btn:hover) {
		background: transparent !important;
	}

	.asset-card-actions :deep(.asset-card-actions__btn--favorite:hover),
	.asset-card-actions :deep(.asset-card-actions__btn--favorite-active) {
		color: rgb(234 179 8) !important;
	}

	.asset-card-actions :deep(.asset-card-actions__btn--copy:hover) {
		color: rgb(8 145 178) !important;
	}

	.asset-card-actions :deep(.asset-card-actions__btn--reveal:hover) {
		color: rgb(59 130 246) !important;
	}

	.asset-card-actions :deep(.asset-card-actions__btn--favorite-active .iconify) {
		color: rgb(234 179 8) !important;
	}
</style>
