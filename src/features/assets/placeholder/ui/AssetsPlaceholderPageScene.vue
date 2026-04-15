<template>
	<section class="assets-placeholder-page">
		<header class="assets-placeholder-page__hero">
			<UBadge
				color="neutral"
				variant="soft"
				size="sm"
				class="assets-placeholder-page__badge">
				{{ t('assets.placeholder.badge') }}
			</UBadge>
			<h1 class="assets-placeholder-page__title">
				{{ t('assets.placeholder.title') }}
			</h1>
			<p class="assets-placeholder-page__description">
				{{ t('assets.placeholder.description') }}
			</p>
		</header>

		<AssetLibraryEmptyState
			icon="i-lucide-hammer"
			:title="t('assets.placeholder.emptyTitle')"
			:description="t('assets.placeholder.emptyDescription')" />

		<section class="assets-placeholder-page__section">
			<div class="assets-placeholder-page__section-head">
				<h2 class="assets-placeholder-page__section-title">
					{{ t('assets.placeholder.preservedTitle') }}
				</h2>
				<p class="assets-placeholder-page__section-description">
					{{ t('assets.placeholder.preservedDescription') }}
				</p>
			</div>

			<div class="assets-placeholder-page__grid">
				<article
					v-for="item in preservedCards"
					:key="item.key"
					class="assets-placeholder-page__card">
					<div class="assets-placeholder-page__card-icon">
						<UIcon
							:name="item.icon"
							class="size-4" />
					</div>
					<div class="assets-placeholder-page__card-title">
						{{ item.title }}
					</div>
					<p class="assets-placeholder-page__card-description">
						{{ item.description }}
					</p>
				</article>
			</div>
		</section>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useI18n } from 'vue-i18n'

	import { useRouteMetaAppHeader } from '@/app/layout/header'
	import AssetLibraryEmptyState from '@/features/assets/shared/ui/AssetLibraryEmptyState.vue'

	useRouteMetaAppHeader('assets-placeholder-page')

	const { t } = useI18n({ useScope: 'global' })

	const preservedCards = computed(() => [
		{
			key: 'migration',
			icon: 'i-lucide-database-zap',
			title: t('assets.placeholder.cards.migration.title'),
			description: t('assets.placeholder.cards.migration.description'),
		},
		{
			key: 'storage',
			icon: 'i-lucide-shield-check',
			title: t('assets.placeholder.cards.storage.title'),
			description: t('assets.placeholder.cards.storage.description'),
		},
		{
			key: 'legacy',
			icon: 'i-lucide-archive',
			title: t('assets.placeholder.cards.legacy.title'),
			description: t('assets.placeholder.cards.legacy.description'),
		},
	])
</script>

<style scoped>
	.assets-placeholder-page {
		display: grid;
		gap: 1.5rem;
		min-height: 100%;
	}

	.assets-placeholder-page__hero {
		position: relative;
		overflow: hidden;
		display: grid;
		gap: 0.85rem;
		padding: 1.75rem;
		border: 1px solid rgb(148 163 184 / 0.18);
		border-radius: 1.75rem;
		background:
			radial-gradient(circle at top left, rgb(34 197 94 / 0.18), transparent 32%),
			radial-gradient(circle at top right, rgb(14 165 233 / 0.18), transparent 28%),
			linear-gradient(145deg, rgb(255 255 255 / 0.94), rgb(248 250 252 / 0.92));
		box-shadow: 0 20px 44px rgb(15 23 42 / 0.08);
	}

	.assets-placeholder-page__badge {
		width: fit-content;
	}

	.assets-placeholder-page__title {
		margin: 0;
		font-size: clamp(1.75rem, 2vw, 2.35rem);
		font-weight: 700;
		line-height: 1.12;
		color: rgb(15 23 42);
	}

	.assets-placeholder-page__description {
		max-width: 42rem;
		margin: 0;
		font-size: 0.96rem;
		line-height: 1.7;
		color: rgb(71 85 105);
	}

	.assets-placeholder-page__section {
		display: grid;
		gap: 1rem;
	}

	.assets-placeholder-page__section-head {
		display: grid;
		gap: 0.35rem;
	}

	.assets-placeholder-page__section-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: rgb(30 41 59);
	}

	.assets-placeholder-page__section-description {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.65;
		color: rgb(100 116 139);
	}

	.assets-placeholder-page__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.assets-placeholder-page__card {
		display: grid;
		gap: 0.75rem;
		padding: 1.15rem;
		border: 1px solid rgb(148 163 184 / 0.18);
		border-radius: 1.25rem;
		background: linear-gradient(180deg, rgb(255 255 255 / 0.92), rgb(248 250 252 / 0.88));
	}

	.assets-placeholder-page__card-icon {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.85rem;
		background: rgb(226 232 240 / 0.72);
		color: rgb(14 116 144);
	}

	.assets-placeholder-page__card-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgb(15 23 42);
	}

	.assets-placeholder-page__card-description {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.7;
		color: rgb(71 85 105);
	}

	@media (max-width: 960px) {
		.assets-placeholder-page__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.assets-placeholder-page__hero {
			padding: 1.35rem;
		}

		.assets-placeholder-page__grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
