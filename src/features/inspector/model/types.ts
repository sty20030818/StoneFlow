import type {
	ActivityLogEntityType as InspectorActivityLogEntityTypeDto,
	ActivityLogEntry as InspectorActivityLogDto,
	ListActivityLogsArgs as InspectorActivityLogsArgsDto,
} from '@/services/api/logs'
import type {
	CustomFieldItem as InspectorCustomFieldDto,
	CustomFields as InspectorCustomFieldsDto,
	LinkDto as InspectorLinkDto,
	LinkInput as InspectorLinkInputDto,
	TaskDto as InspectorTaskDto,
	UpdateTaskPatch as InspectorTaskPatchDto,
} from '@/services/api/tasks'
import type { ProjectDto as InspectorProjectDto, UpdateProjectPatch as InspectorProjectPatchDto } from '@/services/api/projects'

export type InspectorActivityLogEntityType = InspectorActivityLogEntityTypeDto
export type InspectorActivityLog = InspectorActivityLogDto
export type InspectorActivityLogsArgs = InspectorActivityLogsArgsDto

export type InspectorLink = InspectorLinkDto
export type InspectorLinkInput = InspectorLinkInputDto
export type InspectorCustomField = InspectorCustomFieldDto
export type InspectorCustomFields = InspectorCustomFieldsDto

export type InspectorTask = InspectorTaskDto
export type InspectorTaskPatch = InspectorTaskPatchDto
export type InspectorProject = InspectorProjectDto
export type InspectorProjectPatch = InspectorProjectPatchDto

/**
 * 历史兼容别名：逐步迁移到 Inspector* 命名。
 */
export type ActivityLogEntry = InspectorActivityLog
export type ActivityLogEntityType = InspectorActivityLogEntityType
export type ListActivityLogsArgs = InspectorActivityLogsArgs
export type LinkDto = InspectorLink
export type LinkInput = InspectorLinkInput
export type CustomFieldItem = InspectorCustomField
export type CustomFields = InspectorCustomFields
export type TaskDto = InspectorTask
export type UpdateTaskPatch = InspectorTaskPatch
export type ProjectDto = InspectorProject
export type UpdateProjectPatch = InspectorProjectPatch

function mapInspectorLinkDtoToDomain(link: InspectorLinkDto): InspectorLink {
	return {
		...link,
	}
}

function mapInspectorLinksDtoToDomain(links: InspectorLinkDto[]): InspectorLink[] {
	return links.map(mapInspectorLinkDtoToDomain)
}

function mapInspectorCustomFieldsDtoToDomain(
	customFields: InspectorCustomFieldsDto | null,
): InspectorCustomFields | null {
	if (!customFields) return null
	return {
		fields: customFields.fields.map((field) => ({
			...field,
		})),
	}
}

function mapInspectorCustomFieldsDomainToDto(
	customFields: InspectorCustomFields | null | undefined,
): InspectorCustomFieldsDto | null | undefined {
	if (customFields === undefined) return undefined
	if (customFields === null) return null
	return {
		fields: customFields.fields.map((field) => ({
			...field,
		})),
	}
}

function mapInspectorLinksDomainToDto(links: InspectorLinkInput[] | undefined): InspectorLinkInputDto[] | undefined {
	if (!links) return undefined
	return links.map((link) => ({
		...link,
	}))
}

export function mapInspectorTaskDtoToDomain(task: InspectorTaskDto): InspectorTask {
	return {
		...task,
		tags: [...task.tags],
		links: mapInspectorLinksDtoToDomain(task.links),
		customFields: mapInspectorCustomFieldsDtoToDomain(task.customFields),
	}
}

export function mapInspectorProjectDtoToDomain(project: InspectorProjectDto): InspectorProject {
	return {
		...project,
		tags: [...project.tags],
		links: mapInspectorLinksDtoToDomain(project.links),
	}
}

export function mapInspectorActivityLogDtoToDomain(log: InspectorActivityLogDto): InspectorActivityLog {
	return {
		...log,
	}
}

export function mapInspectorActivityLogsDtoToDomain(logs: InspectorActivityLogDto[]): InspectorActivityLog[] {
	return logs.map(mapInspectorActivityLogDtoToDomain)
}

export function mapInspectorTaskPatchToDto(patch: InspectorTaskPatch): InspectorTaskPatchDto {
	return {
		...patch,
		tags: patch.tags ? [...patch.tags] : patch.tags,
		links: mapInspectorLinksDomainToDto(patch.links),
		customFields: mapInspectorCustomFieldsDomainToDto(patch.customFields),
	}
}

export function mapInspectorProjectPatchToDto(patch: InspectorProjectPatch): InspectorProjectPatchDto {
	return {
		...patch,
		tags: patch.tags ? [...patch.tags] : patch.tags,
		links: mapInspectorLinksDomainToDto(patch.links),
	}
}
