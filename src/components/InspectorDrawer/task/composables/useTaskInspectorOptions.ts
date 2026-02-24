import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { SPACE_OPTIONS } from '@/config/space'
import { PROJECT_ICON, PROJECT_LEVEL_TEXT_CLASSES } from '@/config/project'
import { TASK_DONE_REASON_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_STATUS_SEGMENT_OPTIONS } from '@/config/task'
import type { useProjectsStore } from '@/stores/projects'
import { DRAWER_LINK_KIND_VALUES, buildDrawerLinkKindOptions } from '../../shared/constants'

export type LinkKindOption = {
	value: (typeof DRAWER_LINK_KIND_VALUES)[number]
	label: string
}

export function useTaskInspectorOptions(params: {
	spaceIdLocal: Ref<string>
	projectsStore: ReturnType<typeof useProjectsStore>
}) {
	const { spaceIdLocal, projectsStore } = params
	const { t } = useI18n({ useScope: 'global' })

	const statusSegmentOptions = computed(() =>
		TASK_STATUS_SEGMENT_OPTIONS.map((item) => ({
			...item,
			label: t(`task.status.${item.value}`),
		})),
	)
	const doneReasonOptions = computed(() =>
		TASK_DONE_REASON_OPTIONS.map((item) => ({
			...item,
			label: t(`task.doneReason.${item.value}`),
		})),
	)
	const priorityOptions = TASK_PRIORITY_OPTIONS
	const spaceOptions = computed(() => SPACE_OPTIONS)
	const linkKindOptions = computed(() => buildDrawerLinkKindOptions(t))

	const projectOptions = computed(() => {
		const sid = spaceIdLocal.value
		if (!sid) return []
		const projects = projectsStore.getProjectsOfSpace(sid)
		const levelColors = PROJECT_LEVEL_TEXT_CLASSES

		const options: Array<{ value: string | null; label: string; icon: string; iconClass: string; depth: number }> = []
		const defaultProject = projects.find((project) => project.id.endsWith('_default'))

		function addProjects(parentId: string | null, depth: number, skipProjectId?: string) {
			const children = projects.filter((p) => p.parentId === parentId)
			for (const proj of children) {
				if (skipProjectId && proj.id === skipProjectId) continue
				options.push({
					value: proj.id,
					label: proj.title,
					icon: PROJECT_ICON,
					iconClass: levelColors[Math.min(depth, levelColors.length - 1)],
					depth,
				})
				addProjects(proj.id, depth + 1)
			}
		}

		if (defaultProject) {
			options.push({
				value: defaultProject.id,
				label: defaultProject.title,
				icon: PROJECT_ICON,
				iconClass: levelColors[0],
				depth: 0,
			})
			addProjects(defaultProject.id, 1)
		}

		addProjects(null, 0, defaultProject?.id)

		return options
	})

	return {
		statusSegmentOptions,
		doneReasonOptions,
		priorityOptions,
		spaceOptions,
		projectOptions,
		linkKindOptions,
	}
}
