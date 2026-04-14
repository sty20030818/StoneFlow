<template>
	<UTabs
		:items="settingsTabItems"
		:model-value="activeSettingsTab"
		:content="false"
		color="neutral"
		variant="pill"
		size="sm"
		:ui="settingsTabsUi"
		@update:model-value="onSettingsTabChange">
		<template #leading="{ item }">
			<UIcon
				:name="item.icon"
				class="size-3.5"
				:class="activeSettingsTab === item.value ? 'text-default' : 'text-muted'" />
		</template>
	</UTabs>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useRoute, useRouter } from 'vue-router'

	import { useSettingsNav } from '../../logic/useSettingsNav'

	const route = useRoute()
	const router = useRouter()
	const { navItems: settingsNavItems, isActive: isSettingsNavActive } = useSettingsNav()

	const settingsTabsUi = {
		root: 'w-fit',
		list: 'rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'rounded-full px-3 py-2 text-xs font-medium hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default data-[state=active]:text-default',
		leadingIcon: 'size-3.5',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}
	const settingsTabItems = computed(() =>
		settingsNavItems.value.map((item) => ({
			label: item.label,
			value: item.to,
			icon: item.icon,
		})),
	)
	const activeSettingsTab = computed(() => {
		const matched = settingsNavItems.value.find((item) => isSettingsNavActive(item.to))
		return matched?.to ?? '/settings/appearance'
	})

	function onSettingsTabChange(value: string | number) {
		if (typeof value !== 'string' || route.path === value) return
		void router.push(value)
	}
</script>
