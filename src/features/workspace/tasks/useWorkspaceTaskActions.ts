import { useErrorHandler } from '@/composables/base/useErrorHandler'
import { useWorkspaceEntityRepository } from '../entities/repository'
import { getWorkspaceTaskByIdSnapshot } from '../entities/selectors'
import { refreshWorkspaceProjectsQuery } from '../shared/queries'
import { completeWorkspaceTask, updateWorkspaceTask, type WorkspaceTaskUpdatePatch } from './mutations'

/**
 * Workspace 任务写操作编排（complete/update + 实体回写 + 定向同步）。
 */
type WorkspaceTaskLocalPatch = Pick<WorkspaceTaskUpdatePatch, 'title' | 'status' | 'doneReason' | 'spaceId' | 'projectId'>

export function useWorkspaceTaskActions() {
	const { handleApiError, handleSuccess } = useErrorHandler()
	const repository = useWorkspaceEntityRepository()

	function buildNextTaskSnapshot(
		taskId: string,
		patch: WorkspaceTaskLocalPatch & { status?: 'todo' | 'done'; doneReason?: WorkspaceTaskUpdatePatch['doneReason'] },
	) {
		const currentTask = getWorkspaceTaskByIdSnapshot(taskId)
		if (!currentTask) return null

		const now = Date.now()
		const nextStatus = patch.status ?? currentTask.status
		const nextDoneReason =
			patch.doneReason !== undefined
				? patch.doneReason
				: nextStatus === 'done'
					? (currentTask.doneReason ?? 'completed')
					: null
		const nextCompletedAt = nextStatus === 'done' ? currentTask.completedAt ?? now : null

		return {
			...currentTask,
			...patch,
			status: nextStatus,
			doneReason: nextDoneReason,
			completedAt: nextCompletedAt,
			updatedAt: now,
		}
	}

	async function syncProjectSpace(taskId: string, patch: WorkspaceTaskLocalPatch & { status?: 'todo' | 'done' }) {
		const currentTask = getWorkspaceTaskByIdSnapshot(taskId)
		if (!currentTask) return
		if (patch.status === undefined && patch.spaceId === undefined && patch.projectId === undefined) return
		await refreshWorkspaceProjectsQuery(patch.spaceId ?? currentTask.spaceId, { force: true })
	}

	async function complete(taskId: string): Promise<boolean> {
		try {
			await completeWorkspaceTask(taskId)
			const nextTask = buildNextTaskSnapshot(taskId, { status: 'done', doneReason: 'completed' })
			if (nextTask) {
				repository.upsertTask(nextTask)
				await refreshWorkspaceProjectsQuery(nextTask.spaceId, { force: true })
			}
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
			const nextTask = buildNextTaskSnapshot(taskId, patch)
			if (nextTask) {
				repository.upsertTask(nextTask)
				await syncProjectSpace(taskId, patch)
			}
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
