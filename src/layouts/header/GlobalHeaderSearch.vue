<template>
	<div class="relative shrink-0">
		<UInput
			v-model="searchQuery"
			:placeholder="t('header.searchPlaceholder')"
			icon="i-lucide-search"
			size="sm"
			:ui="{
				width: 'w-64',
			}"
			class="rounded-full! [&>div]:rounded-full! [&_input]:rounded-full!" />
	</div>
</template>

<script setup lang="ts">
	import { ref } from 'vue'
	import { useI18n } from 'vue-i18n'

	const { t } = useI18n({ useScope: 'global' })
	const searchQuery = ref('')
</script>
