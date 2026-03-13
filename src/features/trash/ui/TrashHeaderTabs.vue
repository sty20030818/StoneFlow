<template>
	<UTabs
		:items="viewTabItems"
		:model-value="viewMode"
		:content="false"
		color="neutral"
		variant="pill"
		size="sm"
		:ui="viewTabsUi"
		@update:model-value="onViewModeChange">
		<template #leading="{ item }">
			<UIcon
				:name="item.icon"
				class="size-3.5"
				:class="viewMode === item.value ? item.iconClass : 'text-muted'" />
		</template>
	</UTabs>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useI18n } from 'vue-i18n'

	import { useTrashViewMode } from '../composables/useTrashViewMode'

	const { t } = useI18n({ useScope: 'global' })
	const viewMode = useTrashViewMode()

	const viewTabsUi = {
		root: 'w-fit',
		list: 'rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'rounded-full px-3.5 py-1.5 text-[11px] font-semibold hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default hover:data-[state=inactive]:shadow-sm data-[state=active]:text-default',
		leadingIcon: 'size-3.5',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}
	const viewTabItems = computed(() => [
		{
			value: 'projects' as const,
			label: t('trash.tabs.projects'),
			icon: 'i-lucide-folder',
			iconClass: 'text-emerald-600',
		},
		{
			value: 'tasks' as const,
			label: t('trash.tabs.tasks'),
			icon: 'i-lucide-list-checks',
			iconClass: 'text-pink-500',
		},
	])

	function onViewModeChange(value: string | number) {
		if (value !== 'projects' && value !== 'tasks') return
		viewMode.value = value
	}
</script>
