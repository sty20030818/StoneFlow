import type {
	CustomFieldItem as WorkspaceCustomFieldDto,
	CustomFields as WorkspaceCustomFieldsDto,
	LinkDto as WorkspaceLinkDto,
	LinkInput as WorkspaceLinkInputDto,
	ListTasksArgs as WorkspaceTaskListArgsDto,
	TaskDto as WorkspaceTaskDto,
	UpdateTaskPatch as WorkspaceTaskPatchDto,
} from '@/services/api/tasks'
import type { ProjectDto as WorkspaceProjectDto } from '@/services/api/projects'

export type WorkspaceLink = WorkspaceLinkDto
export type WorkspaceLinkInput = WorkspaceLinkInputDto
export type WorkspaceCustomField = WorkspaceCustomFieldDto
export type WorkspaceCustomFields = WorkspaceCustomFieldsDto

export type WorkspaceTask = WorkspaceTaskDto
export type WorkspaceProject = WorkspaceProjectDto
export type WorkspaceTaskListArgs = WorkspaceTaskListArgsDto
export type WorkspaceTaskPatch = WorkspaceTaskPatchDto

function mapWorkspaceLinkDtoToDomain(link: WorkspaceLinkDto): WorkspaceLink {
	return {
		...link,
	}
}

function mapWorkspaceLinksDtoToDomain(links: WorkspaceLinkDto[]): WorkspaceLink[] {
	return links.map(mapWorkspaceLinkDtoToDomain)
}

function mapWorkspaceCustomFieldsDtoToDomain(
	customFields: WorkspaceCustomFieldsDto | null,
): WorkspaceCustomFields | null {
	if (!customFields) return null
	return {
		fields: customFields.fields.map((field) => ({
			...field,
		})),
	}
}

function mapWorkspaceCustomFieldsDomainToDto(
	customFields: WorkspaceCustomFields | null | undefined,
): WorkspaceCustomFieldsDto | null | undefined {
	if (customFields === undefined) return undefined
	if (customFields === null) return null
	return {
		fields: customFields.fields.map((field) => ({
			...field,
		})),
	}
}

function mapWorkspaceLinksDomainToDto(links: WorkspaceLinkInput[] | undefined): WorkspaceLinkInputDto[] | undefined {
	if (!links) return undefined
	return links.map((link) => ({
		...link,
	}))
}

export function mapWorkspaceTaskDtoToDomain(task: WorkspaceTaskDto): WorkspaceTask {
	return {
		...task,
		tags: [...task.tags],
		links: mapWorkspaceLinksDtoToDomain(task.links),
		customFields: mapWorkspaceCustomFieldsDtoToDomain(task.customFields),
	}
}

export function mapWorkspaceTasksDtoToDomain(tasks: WorkspaceTaskDto[]): WorkspaceTask[] {
	return tasks.map(mapWorkspaceTaskDtoToDomain)
}

export function mapWorkspaceProjectDtoToDomain(project: WorkspaceProjectDto): WorkspaceProject {
	return {
		...project,
		tags: [...project.tags],
		links: mapWorkspaceLinksDtoToDomain(project.links),
	}
}

export function mapWorkspaceProjectsDtoToDomain(projects: WorkspaceProjectDto[]): WorkspaceProject[] {
	return projects.map(mapWorkspaceProjectDtoToDomain)
}

export function mapWorkspaceTaskPatchToDto(patch: WorkspaceTaskPatch): WorkspaceTaskPatchDto {
	return {
		...patch,
		tags: patch.tags ? [...patch.tags] : patch.tags,
		links: mapWorkspaceLinksDomainToDto(patch.links),
		customFields: mapWorkspaceCustomFieldsDomainToDto(patch.customFields),
	}
}
