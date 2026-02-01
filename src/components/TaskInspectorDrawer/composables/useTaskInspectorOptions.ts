import { computed, type Ref } from 'vue'

import { SPACE_OPTIONS } from '@/config/space'
import {
	PROJECT_ICON,
	PROJECT_LEVEL_TEXT_CLASSES,
	PROJECT_UNCATEGORIZED_ICON,
	PROJECT_UNCATEGORIZED_ICON_CLASS,
	UNCATEGORIZED_LABEL,
} from '@/config/project'
import { TASK_DONE_REASON_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_STATUS_SEGMENT_OPTIONS } from '@/config/task'
import type { useProjectsStore } from '@/stores/projects'

export function useTaskInspectorOptions(params: {
	spaceIdLocal: Ref<string>
	projectsStore: ReturnType<typeof useProjectsStore>
}) {
	const { spaceIdLocal, projectsStore } = params

	const statusSegmentOptions = TASK_STATUS_SEGMENT_OPTIONS
	const doneReasonOptions = TASK_DONE_REASON_OPTIONS
	const priorityOptions = TASK_PRIORITY_OPTIONS
	const spaceOptions = computed(() => SPACE_OPTIONS)

	const projectOptions = computed(() => {
		const sid = spaceIdLocal.value
		if (!sid) return []
		const projects = projectsStore.getProjectsOfSpace(sid)
		const levelColors = PROJECT_LEVEL_TEXT_CLASSES

		const options: Array<{ value: string | null; label: string; icon: string; iconClass: string; depth: number }> = []

		options.push({
			value: null,
			label: UNCATEGORIZED_LABEL,
			icon: PROJECT_UNCATEGORIZED_ICON,
			iconClass: PROJECT_UNCATEGORIZED_ICON_CLASS,
			depth: 0,
		})

		function addProjects(parentId: string | null, depth: number) {
			const children = projects.filter((p) => p.parentId === parentId)
			for (const proj of children) {
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
		addProjects(null, 0)

		return options
	})

	return {
		statusSegmentOptions,
		doneReasonOptions,
		priorityOptions,
		spaceOptions,
		projectOptions,
	}
}
