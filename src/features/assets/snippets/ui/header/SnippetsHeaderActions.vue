<template>
	<div class="flex items-center gap-2 shrink-0">
		<UPopover
			:ui="popoverUi"
			:popper="{ placement: 'bottom-end', strategy: 'fixed' }">
			<button
				type="button"
				:class="filterButtonClass">
				<UIcon
					name="i-lucide-sliders-horizontal"
					:class="HEADER_CAPSULE_ICON" />
				<span>{{ t('assets.snippets.header.filterAction') }}</span>
				<span
					v-if="activeFilterCount > 0"
					class="snippet-header-actions__count">
					{{ activeFilterCount }}
				</span>
			</button>

			<template #content>
				<section class="snippet-header-filters">
					<header class="snippet-header-filters__toolbar">
						<div class="snippet-header-filters__status">
							<UBadge
								color="neutral"
								variant="soft"
								size="sm">
								{{ activeFilterCount > 0 ? `${activeFilterCount} ${t('assets.snippets.header.filterActive')}` : t('assets.snippets.header.filterIdle') }}
							</UBadge>
						</div>
						<UButton
							v-if="hasActiveFilters"
							color="neutral"
							variant="ghost"
							size="xs"
							icon="i-lucide-filter-x"
							@click="resetSnippetHeaderFilters">
							{{ t('assets.snippets.actions.clearFilters') }}
						</UButton>
					</header>

					<div class="snippet-header-filters__grid">
						<div class="snippet-header-filters__item">
							<div class="snippet-header-filters__label">{{ t('assets.snippets.fields.language') }}</div>
							<USelectMenu
								v-model="selectedLanguage"
								:items="languageOptions"
								value-key="value"
								label-key="label"
								size="sm"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
						</div>

						<div class="snippet-header-filters__item">
							<div class="snippet-header-filters__label">{{ t('assets.snippets.fields.tagsOptional') }}</div>
							<USelectMenu
								v-model="selectedTag"
								:items="tagOptions"
								value-key="value"
								label-key="label"
								size="sm"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
						</div>

						<div class="snippet-header-filters__item">
							<div class="snippet-header-filters__label">{{ t('assets.snippets.header.favoriteFilter') }}</div>
							<USelectMenu
								v-model="selectedFavoriteFilter"
								:items="favoriteOptions"
								value-key="value"
								label-key="label"
								size="sm"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
						</div>

						<div class="snippet-header-filters__item">
							<div class="snippet-header-filters__label">{{ t('assets.snippets.header.sort') }}</div>
							<USelectMenu
								v-model="selectedSort"
								:items="sortOptions"
								value-key="value"
								label-key="label"
								size="sm"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
						</div>
					</div>
				</section>
			</template>
		</UPopover>

		<button
			type="button"
			:class="newButtonClass"
			@click="triggerSnippetCreateAction">
			<UIcon
				name="i-lucide-plus"
				:class="HEADER_CAPSULE_ICON" />
			<span>{{ t('common.actions.new') }}</span>
		</button>
	</div>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useI18n } from 'vue-i18n'

	import { createPopoverLayerUi } from '@/config/ui-layer'
	import {
		HEADER_CAPSULE_BASE,
		HEADER_CAPSULE_ICON,
		HEADER_CAPSULE_NEUTRAL,
		HEADER_CAPSULE_TONE_EMERALD,
		joinCapsuleClass,
	} from '@/config/ui/capsule'
	import { assetModalSelectMenuUi } from '@/features/assets'

	import { useAssetsSnippetsHeaderBridge } from '../../composables/useAssetsSnippetsHeaderBridge'

	const { t } = useI18n({ useScope: 'global' })
	const {
		selectedLanguage,
		selectedTag,
		selectedFavoriteFilter,
		selectedSort,
		languageOptions,
		tagOptions,
		favoriteOptions,
		sortOptions,
		hasActiveFilters,
		activeFilterCount,
		resetSnippetHeaderFilters,
		triggerSnippetCreateAction,
	} = useAssetsSnippetsHeaderBridge()

	const popoverUi = createPopoverLayerUi({
		content:
			'w-[24rem] rounded-[1.5rem] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-0 shadow-[0_28px_72px_rgba(15,23,42,0.18)]',
	})

	const filterButtonClass = computed(() =>
		joinCapsuleClass(
			HEADER_CAPSULE_BASE,
			hasActiveFilters.value ? HEADER_CAPSULE_TONE_EMERALD : HEADER_CAPSULE_NEUTRAL,
		),
	)

	const newButtonClass = joinCapsuleClass(HEADER_CAPSULE_BASE, HEADER_CAPSULE_TONE_EMERALD)
</script>

<style scoped>
	.snippet-header-actions__count {
		display: inline-grid;
		place-items: center;
		min-width: 1.2rem;
		height: 1.2rem;
		padding-inline: 0.28rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.16);
		font-size: 0.68rem;
		line-height: 1;
	}

	.snippet-header-filters {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
	}

	.snippet-header-filters__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding-bottom: 0.1rem;
	}

	.snippet-header-filters__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.snippet-header-filters__item {
		display: grid;
		gap: 0.4rem;
		padding: 0.8rem;
		border: 1px solid rgb(226 232 240 / 0.92);
		border-radius: 1rem;
		background: rgb(255 255 255 / 0.72);
	}

	.snippet-header-filters__label {
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.4;
		color: rgb(71 85 105);
	}

	@media (max-width: 640px) {
		.snippet-header-filters__grid {
			grid-template-columns: 1fr;
		}
	}
</style>
