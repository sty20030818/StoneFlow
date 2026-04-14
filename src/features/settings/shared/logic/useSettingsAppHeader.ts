import { useRegisterAppHeader } from '@/app/layout/header'

import SettingsHeaderTabs from '../ui/header/SettingsHeaderTabs.vue'

export function useSettingsAppHeader() {
	useRegisterAppHeader(
		{
			center: SettingsHeaderTabs,
			search: 'hide',
		},
		'settings-app-header',
	)
}
