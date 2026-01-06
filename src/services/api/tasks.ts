import { tauriInvoke } from '@/services/tauri/invoke'

export type TaskStatus = 'todo' | 'doing' | 'done' | 'archived' | string

export type TaskDto = {
	id: string
	space_id: string
	project_id: string | null
	title: string
	note: string | null
	status: TaskStatus
	priority: number | null
	due_at: number | null
	order_in_list: number
	created_at: number
	started_at: number | null
	completed_at: number | null
	timeline_edited_at: number | null
	timeline_edit_reason: string | null
}

export type ListTasksArgs = {
	spaceId?: string
	/**
	 * - 不传：不按 project 过滤
	 * - null：只取 project_id IS NULL（Inbox）
	 * - string：只取某 projectId
	 */
	projectId?: string | null
	status?: TaskStatus
}

export async function listTasks(args: ListTasksArgs): Promise<TaskDto[]> {
	return await tauriInvoke<TaskDto[]>('list_tasks', { args })
}

export type CreateTaskArgs = {
	spaceId: string
	projectId?: string
	title: string
	note?: string
	autoStart?: boolean
}

export async function createTask(args: CreateTaskArgs): Promise<TaskDto> {
	return await tauriInvoke<TaskDto>('create_task', { args })
}

export type UpdateTaskPatch = {
	title?: string
	note?: string | null
	status?: TaskStatus
	projectId?: string | null
}

export async function updateTask(id: string, patch: UpdateTaskPatch): Promise<void> {
	await tauriInvoke<void>('update_task', {
		args: { id, patch },
	})
}

export async function completeTask(id: string): Promise<void> {
	await tauriInvoke<void>('complete_task', { args: { id } })
}

export type UpdateTaskTimelineArgs = {
	id: string
	createdAt?: number
	startedAt?: number | null
	reason: string
}

export async function updateTaskTimeline(args: UpdateTaskTimelineArgs): Promise<void> {
	await tauriInvoke<void>('update_task_timeline', { args })
}
