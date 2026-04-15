<template>
	<div class="app-desktop-no-drag relative w-[18rem] shrink-0">
		<UInput
			v-model="searchKeyword"
			:placeholder="t('assets.snippets.searchPlaceholder')"
			icon="i-lucide-search"
			size="sm"
			variant="none"
			:ui="{
				root: 'w-full',
				base: HEADER_CAPSULE_INPUT,
				leading: 'ps-4',
				leadingIcon: HEADER_CAPSULE_INPUT_ICON,
			}"
			class="w-full" />
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'

	import { HEADER_CAPSULE_INPUT, HEADER_CAPSULE_INPUT_ICON } from '@/shared/config/ui/capsule'

	import { useAssetsSnippetsHeaderBridge } from '../../logic/useAssetsSnippetsHeaderBridge'

	const { t } = useI18n({ useScope: 'global' })
	const { searchKeyword } = useAssetsSnippetsHeaderBridge()
</script>
