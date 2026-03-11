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
 * 这里的 query 只承担加载态与错误态，真正渲染数据统一来自实体缓存 selector。
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

/**
 * 任务看板 controller 直接复用 query + selector 组合。
 * 任务实体已经按 space + status 落库，页面只再额外提供当前 project 视角的投影。
 */
export function useWorkspaceTaskBoardController(
	spaceId?: MaybeRefOrGetter<string | undefined>,
	projectId?: MaybeRefOrGetter<string | null | undefined>,
) {
	return useWorkspaceTaskBoardQuery(spaceId, projectId)
}
