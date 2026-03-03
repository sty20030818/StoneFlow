import { useI18n } from 'vue-i18n'
import { watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { useWorkspaceTaskBoardQuery } from '@/features/workspace/model'
import { useTaskActions } from '@/composables/useTaskActions'
import { resolveErrorMessage } from '@/utils/error-message'

/**
 * 统一的项目任务数据加载与操作逻辑
 * 支持两种模式：
 * 1. All Tasks: projectId=undefined（可选 spaceId，用于按 Space 过滤）
 * 2. Project: spaceId 有值, projectId 有值
 *
 * @param spaceId 可选的 Space ID，传入则按 Space 筛选，不传则获取所有
 * @param projectId 可选的 Project ID，传入则按 Project 筛选
 */
export function useProjectTasks(
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

	const { complete } = useTaskActions()

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
