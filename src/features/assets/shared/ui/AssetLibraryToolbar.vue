<template>
	<header class="asset-library-toolbar">
		<div class="asset-library-toolbar__copy">
			<div class="asset-library-toolbar__eyebrow">
				<slot name="eyebrow" />
			</div>
			<div class="asset-library-toolbar__title-row">
				<div>
					<div class="asset-library-toolbar__title">{{ title }}</div>
					<div
						v-if="description"
						class="asset-library-toolbar__description">
						{{ description }}
					</div>
				</div>
				<div
					v-if="$slots.actions"
					class="asset-library-toolbar__actions">
					<slot name="actions" />
				</div>
			</div>
		</div>

		<div class="asset-library-toolbar__controls">
			<UInput
				v-model="searchModel"
				icon="i-lucide-search"
				:placeholder="searchPlaceholder"
				size="sm"
				class="asset-library-toolbar__search" />
			<div
				v-if="$slots.filters"
				class="asset-library-toolbar__filters">
				<slot name="filters" />
			</div>
		</div>
	</header>
</template>

<script setup lang="ts">
	type Props = {
		title: string
		description?: string
		searchPlaceholder: string
	}

	defineProps<Props>()

	const searchModel = defineModel<string>('search', {
		default: '',
	})
</script>

<style scoped>
	.asset-library-toolbar {
		display: grid;
		gap: 1rem;
		padding: 1.1rem 1.2rem 1.2rem;
		border: 1px solid rgb(226 232 240 / 0.9);
		border-radius: 1.8rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.96), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top left, rgb(34 211 238 / 0.18), transparent 38%),
			radial-gradient(circle at top right, rgb(251 191 36 / 0.12), transparent 34%);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.9),
			0 18px 44px rgb(15 23 42 / 0.08);
	}

	.asset-library-toolbar__copy {
		display: grid;
		gap: 0.75rem;
	}

	.asset-library-toolbar__eyebrow {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgb(14 116 144);
	}

	.asset-library-toolbar__title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.asset-library-toolbar__title {
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgb(15 23 42);
	}

	.asset-library-toolbar__description {
		margin-top: 0.25rem;
		font-size: 0.78rem;
		line-height: 1.55;
		color: rgb(71 85 105);
	}

	.asset-library-toolbar__actions,
	.asset-library-toolbar__filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.asset-library-toolbar__controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.asset-library-toolbar__search {
		min-width: min(100%, 18rem);
		flex: 1 1 18rem;
	}

	@media (max-width: 768px) {
		.asset-library-toolbar__title-row {
			flex-direction: column;
		}

		.asset-library-toolbar__controls {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
