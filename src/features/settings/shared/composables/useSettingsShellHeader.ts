import { useRegisterShellHeader } from '@/app/shell-header'

import SettingsHeaderLocaleTabs from '../ui/header/SettingsHeaderLocaleTabs.vue'
import SettingsHeaderTabs from '../ui/header/SettingsHeaderTabs.vue'

export function useSettingsShellHeader() {
	useRegisterShellHeader(
		{
			center: SettingsHeaderTabs,
			rightPrimary: SettingsHeaderLocaleTabs,
			search: 'hide',
		},
		'settings-shell',
	)
}
