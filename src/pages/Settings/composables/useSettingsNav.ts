import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { SETTINGS_NAV_ITEMS } from '../config'

export function useSettingsNav() {
	const route = useRoute()

	const navItems = computed(() => SETTINGS_NAV_ITEMS)

	function isActive(path: string) {
		return route.path === path || route.path.startsWith(`${path}/`)
	}

	return {
		navItems,
		isActive,
	}
}
