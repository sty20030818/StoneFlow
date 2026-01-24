import { tauriInvoke } from '@/services/tauri/invoke'

export type TaskStatus = 'todo' | 'doing' | 'done' | 'archived' | string

export type TaskDto = {
	id: string
	space_id: string
	title: string
	status: TaskStatus
	order_in_list: number
	created_at: number
	started_at: number | null
	completed_at: number | null
}

export type ListTasksArgs = {
	spaceId?: string
	status?: TaskStatus
	projectId?: string | null
}

export async function listTasks(args: ListTasksArgs): Promise<TaskDto[]> {
	return await tauriInvoke<TaskDto[]>('list_tasks', { args })
}

export type CreateTaskArgs = {
	spaceId: string
	title: string
	autoStart?: boolean
	projectId?: string | null
}

export async function createTask(args: CreateTaskArgs): Promise<TaskDto> {
	// Tauri 会自动将 camelCase 转换为 snake_case
	return await tauriInvoke<TaskDto>('create_task', {
		args: {
			spaceId: args.spaceId,
			title: args.title,
			autoStart: args.autoStart,
			projectId: args.projectId ?? null,
		},
	})
}

export type UpdateTaskPatch = {
	title?: string
	status?: TaskStatus
}

export async function updateTask(id: string, patch: UpdateTaskPatch): Promise<void> {
	await tauriInvoke<void>('update_task', {
		args: { id, patch },
	})
}

export async function completeTask(id: string): Promise<void> {
	await tauriInvoke<void>('complete_task', { args: { id } })
}
