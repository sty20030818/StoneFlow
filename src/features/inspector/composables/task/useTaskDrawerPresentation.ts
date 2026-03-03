import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import type { InspectorTask } from '../../model'
import {
	formatDrawerDateTime,
	useDrawerSaveStatePresentation,
	type DrawerSaveState,
} from '../shared'

export function useTaskDrawerPresentation(params: {
	currentTask: Ref<InspectorTask | null>
	saveState: Ref<DrawerSaveState>
}) {
	const { t } = useI18n({ useScope: 'global' })
	const { saveStateVisible } = useDrawerSaveStatePresentation(params.saveState)

	const createdAtFooterLabel = computed(() => {
		return formatDrawerDateTime(params.currentTask.value?.createdAt, {
			fallback: t('inspector.footer.createdAtUnknown'),
			includeWeekday: true,
		})
	})

	return {
		saveStateVisible,
		createdAtFooterLabel,
	}
}
