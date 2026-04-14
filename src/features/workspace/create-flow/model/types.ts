import type { CreateProjectArgs as CreateProjectArgsDto, ProjectDto } from '@/infra/api/projects'
import type {
	CreateTaskArgs as CreateTaskArgsDto,
	CreateTaskWithPatchArgs as CreateTaskWithPatchArgsDto,
	CustomFieldItem as CreateFlowCustomFieldDto,
	CustomFields as CreateFlowCustomFieldsDto,
	LinkDto as CreateFlowLinkDto,
	LinkInput as CreateFlowLinkInputDto,
	TaskDoneReason,
	TaskDto,
	TaskPriorityValue,
	TaskStatus,
	UpdateTaskPatch as UpdateTaskPatchDto,
} from '@/infra/api/tasks'

export type CreateFlowLink = CreateFlowLinkDto
export type CreateFlowLinkInput = CreateFlowLinkInputDto
export type CreateFlowCustomField = CreateFlowCustomFieldDto
export type CreateFlowCustomFields = CreateFlowCustomFieldsDto

export type CreateFlowProject = Omit<ProjectDto, 'tags' | 'links'> & {
	tags: string[]
	links: CreateFlowLink[]
}

export type CreateFlowTask = Omit<TaskDto, 'tags' | 'links' | 'customFields'> & {
	tags: string[]
	links: CreateFlowLink[]
	customFields: CreateFlowCustomFields | null
}

export type CreateProjectArgs = Omit<CreateProjectArgsDto, 'links'> & {
	links?: CreateFlowLinkInput[] | null
}

export type CreateTaskArgs = Omit<CreateTaskArgsDto, 'projectId'> & {
	projectId?: string | null
}

export type CreateTaskWithPatchArgs = Omit<CreateTaskWithPatchArgsDto, 'links' | 'customFields'> & {
	links?: CreateFlowLinkInput[]
	customFields?: CreateFlowCustomFields | null
}

export type UpdateTaskPatch = Omit<UpdateTaskPatchDto, 'links' | 'customFields'> & {
	links?: CreateFlowLinkInput[]
	customFields?: CreateFlowCustomFields | null
}

function mapCreateFlowLinkDtoToDomain(link: CreateFlowLinkDto): CreateFlowLink {
	return {
		...link,
	}
}

function mapCreateFlowLinksDtoToDomain(links: CreateFlowLinkDto[]): CreateFlowLink[] {
	return links.map(mapCreateFlowLinkDtoToDomain)
}

function mapCreateFlowCustomFieldsDtoToDomain(
	customFields: CreateFlowCustomFieldsDto | null,
): CreateFlowCustomFields | null {
	if (!customFields) return null
	return {
		fields: customFields.fields.map((field) => ({ ...field })),
	}
}

function mapCreateFlowLinksDomainToDto(links: CreateFlowLinkInput[] | undefined): CreateFlowLinkInputDto[] | undefined {
	if (!links) return undefined
	return links.map((link) => ({
		...link,
	}))
}

function mapCreateFlowCustomFieldsDomainToDto(
	customFields: CreateFlowCustomFields | null | undefined,
): CreateFlowCustomFieldsDto | null | undefined {
	if (customFields === undefined) return undefined
	if (customFields === null) return null
	return {
		fields: customFields.fields.map((field) => ({ ...field })),
	}
}

export function mapCreateFlowProjectDtoToDomain(project: ProjectDto): CreateFlowProject {
	return {
		...project,
		tags: [...project.tags],
		links: mapCreateFlowLinksDtoToDomain(project.links),
	}
}

export function mapCreateFlowTaskDtoToDomain(task: TaskDto): CreateFlowTask {
	return {
		...task,
		tags: [...task.tags],
		links: mapCreateFlowLinksDtoToDomain(task.links),
		customFields: mapCreateFlowCustomFieldsDtoToDomain(task.customFields),
	}
}

export function mapCreateFlowTaskPatchToDto(patch: UpdateTaskPatch): UpdateTaskPatchDto {
	return {
		...patch,
		tags: patch.tags ? [...patch.tags] : patch.tags,
		links: mapCreateFlowLinksDomainToDto(patch.links),
		customFields: mapCreateFlowCustomFieldsDomainToDto(patch.customFields),
	}
}

export { type TaskDoneReason, type TaskPriorityValue, type TaskStatus }
