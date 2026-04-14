import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { useLoadErrorFeedback } from '@/shared/composables/base/useLoadErrorFeedback'
import { useWorkspaceTaskBoardController } from '../entities/controller'
import { useWorkspaceTaskActions } from '../task-board'

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
	const { t } = useI18n({ useScope: 'global' })
	const { todo, doneAll, loading, refresh, todoError, doneError } = useWorkspaceTaskBoardController(spaceId, projectId)
	const loadError = computed(() => todoError.value ?? doneError.value)
	const hasTasks = computed(() => todo.value.length > 0 || doneAll.value.length > 0)
	const { loadErrorMessage, showLoadErrorState } = useLoadErrorFeedback({
		error: loadError,
		hasData: hasTasks,
		loading,
		toastTitle: computed(() => t('projectView.toast.loadFailedTitle')),
	})

	const { complete } = useWorkspaceTaskActions()

	async function onComplete(taskId: string) {
		await complete(taskId)
	}

	return {
		loading,
		todo,
		doneAll,
		loadErrorMessage,
		showLoadErrorState,
		refresh,
		onComplete,
	}
}
