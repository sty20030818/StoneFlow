import { completeTask, updateTask } from '@/services/api/tasks'
import type { UpdateTaskPatch } from '@/services/api/tasks'

/**
 * 统一的任务操作逻辑（complete, update 等，统一错误处理）
 */
export function useTaskActions() {
	const toast = useToast()

	async function complete(taskId: string): Promise<boolean> {
		try {
			await completeTask(taskId)
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

	async function update(taskId: string, patch: Pick<UpdateTaskPatch, 'title' | 'status'>): Promise<boolean> {
		try {
			await updateTask(taskId, patch)
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
