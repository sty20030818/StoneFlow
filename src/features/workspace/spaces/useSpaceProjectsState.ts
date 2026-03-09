import { computed, type MaybeRefOrGetter } from 'vue'

import { useProjectsQuery } from '../shared/queries'

type UseSpaceProjectsStateOptions = {
	enabled?: MaybeRefOrGetter<boolean>
	staleTime?: number
}

/**
 * 统一封装 space 级项目列表的读取状态，避免页面层散落底层查询细节。
 */
export function useSpaceProjectsState(
	spaceId: MaybeRefOrGetter<string>,
	options: UseSpaceProjectsStateOptions = {},
) {
	const projectsQuery = useProjectsQuery({
		spaceId,
		enabled: options.enabled,
		staleTime: options.staleTime,
	})

	const projects = computed(() => projectsQuery.data.value ?? [])
	const isLoaded = computed(() => projectsQuery.status.value !== 'pending')

	return {
		...projectsQuery,
		projects,
		isLoaded,
	}
}
