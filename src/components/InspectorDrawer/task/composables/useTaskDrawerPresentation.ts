import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import type { TaskDto } from '@/services/api/tasks'
import {
	formatDrawerDateTime,
	useDrawerSaveStatePresentation,
	type DrawerSaveState,
} from '@/components/InspectorDrawer/shared/composables'

export function useTaskDrawerPresentation(params: {
	currentTask: Ref<TaskDto | null>
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
