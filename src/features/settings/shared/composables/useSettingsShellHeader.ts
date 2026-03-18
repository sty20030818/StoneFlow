import { useRegisterShellHeader } from '@/app/shell-header'

import SettingsHeaderTabs from '../ui/header/SettingsHeaderTabs.vue'

export function useSettingsShellHeader() {
	useRegisterShellHeader(
		{
			center: SettingsHeaderTabs,
			search: 'hide',
		},
		'settings-shell',
	)
}
