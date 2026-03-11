import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { useProjectsQuery } from '../shared/queries/useProjectsQuery'
import { useWorkspaceTaskBoardQuery } from '../shared/queries/useWorkspaceTaskBoardQuery'
import { useWorkspaceProjectsSelector } from './selectors'
import { useWorkspaceEntitiesStore } from './store'

export type UseWorkspaceProjectsControllerOptions = {
	spaceId: MaybeRefOrGetter<string | undefined>
	enabled?: MaybeRefOrGetter<boolean>
	staleTime?: number
}

/**
 * Controller 负责连接 transport query 与 selector 投影，页面不再直接消费 query data。
 */
export function useWorkspaceProjectsController(options: UseWorkspaceProjectsControllerOptions) {
	const store = useWorkspaceEntitiesStore()
	const projectsQuery = useProjectsQuery({
		spaceId: computed(() => toValue(options.spaceId) ?? 'work'),
		enabled: computed(() => Boolean(toValue(options.spaceId)) && (toValue(options.enabled) ?? true)),
		staleTime: options.staleTime,
	})
	const projects = useWorkspaceProjectsSelector(options.spaceId)
	const isLoaded = computed(() => {
		const currentSpaceId = toValue(options.spaceId)
		if (!currentSpaceId) return false
		return Boolean(store.loadedProjectSpaces[currentSpaceId]) || projectsQuery.status.value !== 'pending'
	})

	return {
		...projectsQuery,
		projects,
		isLoaded,
	}
}

export function useWorkspaceTaskBoardController(
	spaceId?: MaybeRefOrGetter<string | undefined>,
	projectId?: MaybeRefOrGetter<string | null | undefined>,
) {
	return useWorkspaceTaskBoardQuery(spaceId, projectId)
}
