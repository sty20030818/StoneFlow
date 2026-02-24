import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { SETTINGS_NAV_ITEMS } from '../config'

export function useSettingsNav() {
	const route = useRoute()
	const { t } = useI18n({ useScope: 'global' })

	const navItems = computed(() =>
		SETTINGS_NAV_ITEMS.map((item) => ({
			id: item.id,
			label: t(item.labelKey),
			description: t(item.descriptionKey),
			icon: item.icon,
			to: item.to,
		})),
	)

	function isActive(path: string) {
		return route.path === path || route.path.startsWith(`${path}/`)
	}

	return {
		navItems,
		isActive,
	}
}
