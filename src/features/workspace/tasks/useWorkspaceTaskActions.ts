import { useErrorHandler } from '@/composables/base/useErrorHandler'
import { invalidateWorkspaceTaskAndProjectQueries } from '../shared/model'
import { completeWorkspaceTask, updateWorkspaceTask, type WorkspaceTaskUpdatePatch } from './mutations'

/**
 * Workspace 任务写操作编排（complete/update + 一致性刷新 + 反馈）。
 */
export function useWorkspaceTaskActions() {
	const { handleApiError, handleSuccess } = useErrorHandler()

	async function complete(taskId: string): Promise<boolean> {
		try {
			await completeWorkspaceTask(taskId)
			await invalidateWorkspaceTaskAndProjectQueries()
			handleSuccess('已完成')
			return true
		} catch (error) {
			handleApiError(error, {
				title: '完成失败',
			})
			return false
		}
	}

	async function update(taskId: string, patch: Pick<WorkspaceTaskUpdatePatch, 'title' | 'status'>): Promise<boolean> {
		try {
			await updateWorkspaceTask(taskId, patch)
			await invalidateWorkspaceTaskAndProjectQueries()
			handleSuccess('更新成功')
			return true
		} catch (error) {
			handleApiError(error, {
				title: '更新失败',
			})
			return false
		}
	}

	return {
		complete,
		update,
	}
}
