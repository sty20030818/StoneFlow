import { tauriInvoke } from '@/services/tauri/invoke'
import type { TaskDoneReason, TaskPriorityValue, TaskStatus } from '@/types/domain/task'

export type { TaskDoneReason, TaskPriorityValue, TaskStatus } from '@/types/domain/task'

export type CustomFieldItem = {
	key: string
	label: string
	value: string | null
}

export type CustomFields = {
	fields: CustomFieldItem[]
}

export type TaskDto = {
	id: string
	space_id: string
	project_id: string | null
	title: string
	note: string | null
	status: TaskStatus
	done_reason: TaskDoneReason | null
	priority: TaskPriorityValue
	tags: string[]
	rank: number
	created_at: number
	updated_at: number
	completed_at: number | null
	deadline_at: number | null
	archived_at: number | null
	deleted_at: number | null
	links: string[]
	custom_fields: CustomFields | null
	create_by: string
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
	doneReason?: TaskDoneReason | null
	priority?: TaskPriorityValue
	note?: string | null
	tags?: string[]
	spaceId?: string
	projectId?: string | null
	deadlineAt?: number | null
	rank?: number
	links?: string[]
	customFields?: CustomFields | null
	archivedAt?: number | null
	deletedAt?: number | null
}

export async function updateTask(id: string, patch: UpdateTaskPatch): Promise<void> {
	await tauriInvoke<void>('update_task', {
		args: { id, patch },
	})
}

export async function completeTask(id: string): Promise<void> {
	await tauriInvoke<void>('complete_task', { args: { id } })
}

export async function deleteTasks(ids: string[]): Promise<number> {
	if (ids.length === 0) return 0
	return await tauriInvoke<number>('delete_tasks', {
		args: { ids },
	})
}
