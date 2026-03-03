import { invalidateWorkspaceTaskAndProjectQueries } from '../model'
import { completeWorkspaceTask, updateWorkspaceTask, type WorkspaceTaskUpdatePatch } from '../mutations'

/**
 * Workspace 任务写操作编排（complete/update + 一致性刷新 + 反馈）。
 */
export function useWorkspaceTaskActions() {
	const toast = useToast()

	async function complete(taskId: string): Promise<boolean> {
		try {
			await completeWorkspaceTask(taskId)
			await invalidateWorkspaceTaskAndProjectQueries()
			toast.add({ title: '已完成', color: 'success' })
			return true
		} catch (error) {
			toast.add({
				title: '完成失败',
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
			return false
		}
	}

	async function update(taskId: string, patch: Pick<WorkspaceTaskUpdatePatch, 'title' | 'status'>): Promise<boolean> {
		try {
			await updateWorkspaceTask(taskId, patch)
			await invalidateWorkspaceTaskAndProjectQueries()
			toast.add({ title: '更新成功', color: 'success' })
			return true
		} catch (error) {
			toast.add({
				title: '更新失败',
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
			return false
		}
	}

	return {
		complete,
		update,
	}
}
