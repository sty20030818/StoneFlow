<template>
	<div class="relative w-64 shrink-0">
		<UInput
			v-model="searchQuery"
			:placeholder="t('header.searchPlaceholder')"
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
	import { ref } from 'vue'
	import { useI18n } from 'vue-i18n'
	import { HEADER_CAPSULE_INPUT, HEADER_CAPSULE_INPUT_ICON } from '@/config/ui/capsule'

	const { t } = useI18n({ useScope: 'global' })
	const searchQuery = ref('')
</script>
