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
	spaceId: string
	projectId: string | null
	title: string
	note: string | null
	status: TaskStatus
	doneReason: TaskDoneReason | null
	priority: TaskPriorityValue
	tags: string[]
	rank: number
	createdAt: number
	updatedAt: number
	completedAt: number | null
	deadlineAt: number | null
	archivedAt: number | null
	deletedAt: number | null
	links: string[]
	customFields: CustomFields | null
	createBy: string
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
	// Rust 侧已使用 camelCase 解析请求字段
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
