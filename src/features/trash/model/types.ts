import type { ProjectDto } from '@/services/api/projects'
import type { TaskDto } from '@/services/api/tasks'

export type TrashProject = {
	id: string
	spaceId: string
	parentId: string | null
	path: string
	title: string
	note: string | null
	priority: ProjectDto['priority']
	todoTaskCount: number
	doneTaskCount: number
	lastTaskUpdatedAt: number | null
	createdAt: number
	updatedAt: number
	archivedAt: number | null
	deletedAt: number | null
	createBy: string
	rank: number
	computedStatus: ProjectDto['computedStatus']
	tags: string[]
	links: ProjectDto['links']
}

export type TrashTask = {
	id: string
	spaceId: string
	projectId: string | null
	title: string
	note: string | null
	status: TaskDto['status']
	doneReason: TaskDto['doneReason']
	priority: TaskDto['priority']
	tags: string[]
	rank: number
	createdAt: number
	updatedAt: number
	completedAt: number | null
	deadlineAt: number | null
	archivedAt: number | null
	deletedAt: number | null
	links: TaskDto['links']
	customFields: TaskDto['customFields']
	createBy: string
}

export function mapTrashProjectDtoToDomain(project: ProjectDto): TrashProject {
	return {
		...project,
		tags: [...project.tags],
		links: project.links.map((link) => ({ ...link })),
	}
}

export function mapTrashTaskDtoToDomain(task: TaskDto): TrashTask {
	return {
		...task,
		tags: [...task.tags],
		links: task.links.map((link) => ({ ...link })),
		customFields: task.customFields
			? {
					fields: task.customFields.fields.map((field) => ({ ...field })),
				}
			: null,
	}
}

export function mapTrashProjectsDtoToDomain(projects: ProjectDto[]): TrashProject[] {
	return projects.map(mapTrashProjectDtoToDomain)
}

export function mapTrashTasksDtoToDomain(tasks: TaskDto[]): TrashTask[] {
	return tasks.map(mapTrashTaskDtoToDomain)
}
