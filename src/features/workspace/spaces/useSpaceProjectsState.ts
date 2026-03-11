import type { MaybeRefOrGetter } from 'vue'

import { useWorkspaceProjectsController } from '../entities/controller'

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
	return useWorkspaceProjectsController({
		spaceId,
		enabled: options.enabled,
		staleTime: options.staleTime,
	})
}
