import {
	completeWorkspaceTask,
	updateWorkspaceTask,
	type WorkspaceTaskUpdatePatch,
} from '@/features/workspace'
import { invalidateWorkspaceTaskAndProjectQueries } from '@/features/workspace/model'

/**
 * 统一的任务操作逻辑（complete, update 等，统一错误处理）
 */
export function useTaskActions() {
	const toast = useToast()

	async function complete(taskId: string): Promise<boolean> {
		try {
			await completeWorkspaceTask(taskId)
			await invalidateWorkspaceTaskAndProjectQueries()
			toast.add({ title: '已完成', color: 'success' })
			return true
		} catch (e) {
			toast.add({
				title: '完成失败',
				description: e instanceof Error ? e.message : '未知错误',
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
		} catch (e) {
			toast.add({
				title: '更新失败',
				description: e instanceof Error ? e.message : '未知错误',
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
