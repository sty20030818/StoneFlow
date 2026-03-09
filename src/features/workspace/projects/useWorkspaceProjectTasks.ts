import { useI18n } from 'vue-i18n'
import { watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { useWorkspaceTaskBoardQuery } from '../shared/queries'
import { useWorkspaceTaskActions } from '../tasks'
import { resolveErrorMessage } from '@/utils/error-message'

/**
 * Workspace 看板数据与基础动作编排。
 * 支持两种模式：
 * 1. All Tasks：projectId 为空（可选 spaceId 过滤）
 * 2. Project：spaceId + projectId
 */
export function useWorkspaceProjectTasks(
	spaceId?: MaybeRefOrGetter<string | undefined>,
	projectId?: MaybeRefOrGetter<string | null | undefined>,
) {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const { todo, doneAll, loading, refresh, todoError, doneError } = useWorkspaceTaskBoardQuery(spaceId, projectId)

	watch(
		[todoError, doneError],
		([nextTodoError, nextDoneError], [prevTodoError, prevDoneError]) => {
			const nextError = nextTodoError ?? nextDoneError
			const prevError = prevTodoError ?? prevDoneError
			if (!nextError || nextError === prevError) return
			toast.add({
				title: t('projectView.toast.loadFailedTitle'),
				description: resolveErrorMessage(nextError, t),
				color: 'error',
			})
		},
		{ immediate: true },
	)

	const { complete } = useWorkspaceTaskActions()

	async function onComplete(taskId: string) {
		await complete(taskId)
	}

	return {
		loading,
		todo,
		doneAll,
		refresh,
		onComplete,
	}
}
