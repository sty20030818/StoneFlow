import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useRegisterShellHeader } from '@/app/shell-header'

import { SETTINGS_NAV_ITEMS, type SettingsNavId } from '../config'

export function useSettingsSectionShellHeader(sectionId: SettingsNavId) {
	const { t } = useI18n({ useScope: 'global' })

	useRegisterShellHeader(
		computed(() => {
			const matchedItem = SETTINGS_NAV_ITEMS.find((item) => item.id === sectionId)
			if (!matchedItem) {
				return {
					breadcrumb: [],
				}
			}

			return {
				breadcrumb: [
					{
						label: t(matchedItem.labelKey),
						icon: matchedItem.icon,
						description: t(matchedItem.descriptionKey),
					},
				],
			}
		}),
		`settings-section:${sectionId}`,
	)
}
