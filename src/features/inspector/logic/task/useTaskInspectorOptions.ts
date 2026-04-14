import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { SPACE_OPTIONS } from '@/shared/config/space'
import {
	findDefaultProject,
	getDefaultProjectId,
	getDefaultProjectLabel,
	PROJECT_ICON,
	PROJECT_LEVEL_TEXT_CLASSES,
	PROJECT_UNCATEGORIZED_ICON,
	PROJECT_UNCATEGORIZED_ICON_CLASS,
	isDefaultProjectId,
} from '@/shared/config/project'
import { TASK_DONE_REASON_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_STATUS_SEGMENT_OPTIONS } from '@/shared/config/task'
import type { WorkspaceProject } from '@/features/workspace'
import type { InspectorLink } from '../../model'
import { buildDrawerLinkKindOptions } from '../../ui/InspectorDrawer/shared/constants'

export type LinkKindOption = {
	value: InspectorLink['kind']
	label: string
}

export function useTaskInspectorOptions(params: {
	spaceIdLocal: Ref<string>
	getProjectsOfSpace: (spaceId: string) => WorkspaceProject[]
}) {
	const { spaceIdLocal, getProjectsOfSpace } = params
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
		const projects = getProjectsOfSpace(sid)
		const levelColors = PROJECT_LEVEL_TEXT_CLASSES

		const defaultProject = findDefaultProject(projects)
		const options: Array<{ value: string; label: string; icon: string; iconClass: string; depth: number }> = [
			{
				value: defaultProject?.id ?? getDefaultProjectId(sid),
				label: defaultProject?.title ?? getDefaultProjectLabel(),
				icon: PROJECT_UNCATEGORIZED_ICON,
				iconClass: PROJECT_UNCATEGORIZED_ICON_CLASS,
				depth: 0,
			},
		]

		function addProjects(parentId: string | null, depth: number, skipProjectId?: string) {
			const children = projects.filter((p) => p.parentId === parentId && !isDefaultProjectId(p.id))
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
