<template>
	<div class="asset-empty-state">
		<div class="asset-empty-state__badge">
			<UIcon
				:name="icon"
				class="size-4" />
		</div>
		<div class="asset-empty-state__title">{{ title }}</div>
		<div class="asset-empty-state__description">{{ description }}</div>
		<div
			v-if="$slots.action"
			class="asset-empty-state__action">
			<slot name="action" />
		</div>
	</div>
</template>

<script setup lang="ts">
	type Props = {
		title: string
		description: string
		icon?: string
	}

	withDefaults(defineProps<Props>(), {
		icon: 'i-lucide-library-big',
	})
</script>

<style scoped>
	.asset-empty-state {
		display: grid;
		justify-items: center;
		gap: 0.9rem;
		padding: 3rem 1.5rem;
		border: 1px dashed rgb(148 163 184 / 0.45);
		border-radius: 1.75rem;
		background:
			linear-gradient(135deg, rgb(248 250 252 / 0.96), rgb(241 245 249 / 0.9)),
			radial-gradient(circle at top, rgb(103 232 249 / 0.18), transparent 55%);
		text-align: center;
	}

	.asset-empty-state__badge {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 999px;
		background: linear-gradient(135deg, rgb(14 165 233), rgb(34 197 94));
		color: white;
		box-shadow: 0 16px 28px rgb(14 165 233 / 0.22);
	}

	.asset-empty-state__title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgb(15 23 42);
	}

	.asset-empty-state__description {
		max-width: 28rem;
		font-size: 0.78rem;
		line-height: 1.65;
		color: rgb(71 85 105);
	}

	.asset-empty-state__action {
		padding-top: 0.15rem;
	}
</style>
