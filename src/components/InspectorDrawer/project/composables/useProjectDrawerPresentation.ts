import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { PROJECT_STATUS_DISPLAY, type ProjectComputedStatusValue } from '@/config/project'
import type { ProjectDto } from '@/services/api/projects'
import {
	formatDrawerDateTime,
	resolveDrawerSpaceDisplay,
	useDrawerSaveStatePresentation,
	type DrawerSaveState,
} from '@/components/InspectorDrawer/shared/composables'

export function useProjectDrawerPresentation(params: {
	currentProject: Ref<ProjectDto | null>
	saveState: Ref<DrawerSaveState>
	spaceIdLocal: Ref<string>
}) {
	const { t } = useI18n({ useScope: 'global' })
	const { saveStateLabel, saveStateClass, saveStateDotClass } = useDrawerSaveStatePresentation(params.saveState)

	const statusDisplay = computed(() => {
		const status = (params.currentProject.value?.computedStatus ?? 'inProgress') as ProjectComputedStatusValue
		return PROJECT_STATUS_DISPLAY[status] ?? PROJECT_STATUS_DISPLAY.inProgress
	})

	const statusLabel = computed(() => {
		const status = (params.currentProject.value?.computedStatus ?? 'inProgress') as ProjectComputedStatusValue
		if (status === 'done') return t('inspector.project.status.done')
		if (status === 'archived') return t('inspector.project.status.archived')
		if (status === 'deleted') return t('inspector.project.status.deleted')
		return t('inspector.project.status.inProgress')
	})
	const statusDotClass = computed(() => statusDisplay.value.dot)
	const statusBadgeColor = computed(() => statusDisplay.value.color)

	const createdAtFooterLabel = computed(() => {
		return formatDrawerDateTime(params.currentProject.value?.createdAt, {
			fallback: t('inspector.footer.createdAtUnknown'),
			includeWeekday: true,
		})
	})

	const spaceDisplay = computed(() => {
		return resolveDrawerSpaceDisplay(params.spaceIdLocal.value)
	})

	const currentSpaceLabel = computed(() => spaceDisplay.value.label)
	const currentSpaceIcon = computed(() => spaceDisplay.value.icon)
	const spacePillClass = computed(() => spaceDisplay.value.pillClass)

	const projectTrail = computed(() => {
		const rawPath = params.currentProject.value?.path?.trim()
		if (!rawPath) {
			const title = params.currentProject.value?.title?.trim()
			return title ? [title] : []
		}
		const trail = rawPath
			.split('/')
			.map((segment) => segment.trim())
			.filter(Boolean)
		return trail.length > 0 ? trail : [rawPath]
	})

	return {
		saveStateLabel,
		saveStateClass,
		saveStateDotClass,
		statusLabel,
		statusDotClass,
		statusBadgeColor,
		createdAtFooterLabel,
		currentSpaceLabel,
		currentSpaceIcon,
		spacePillClass,
		projectTrail,
		spaceDisplay,
	}
}
