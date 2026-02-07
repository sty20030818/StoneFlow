import { createGlobalState, useStorage } from '@vueuse/core'
import { ref } from 'vue'

import type { TaskDto } from '@/services/api/tasks'

type SpaceTaskSnapshot = {
	todo: TaskDto[]
	doneToday: TaskDto[]
}

type ProjectTaskSnapshot = {
	todo: TaskDto[]
	doneAll: TaskDto[]
}

export const useTaskSnapshotState = createGlobalState(() => {
	const spaceSnapshots = useStorage<Record<string, SpaceTaskSnapshot>>('space_tasks_snapshot_v1', {})
	const projectSnapshots = useStorage<Record<string, ProjectTaskSnapshot>>('project_tasks_snapshot_v1', {})
	const loadedSpaceScopes = ref(new Set<string>())
	const loadedProjectScopes = ref(new Set<string>())

	return {
		spaceSnapshots,
		projectSnapshots,
		loadedSpaceScopes,
		loadedProjectScopes,
	}
})
