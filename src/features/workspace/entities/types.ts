import type {
	CustomFieldItem as WorkspaceCustomFieldDto,
	CustomFields as WorkspaceCustomFieldsDto,
	LinkDto as WorkspaceLinkDto,
	TaskDto as WorkspaceTaskDto,
	TaskStatus,
} from '@/infra/api/tasks'
import type { ProjectDto as WorkspaceProjectDto } from '@/infra/api/projects'
import { getDefaultProjectId, isDefaultProjectId } from '@/shared/config/project'

export type WorkspaceEntityLink = WorkspaceLinkDto
export type WorkspaceEntityCustomField = WorkspaceCustomFieldDto
export type WorkspaceEntityCustomFields = WorkspaceCustomFieldsDto
export type WorkspaceEntityTask = WorkspaceTaskDto
export type WorkspaceEntityProject = WorkspaceProjectDto
export type WorkspaceEntityTaskStatus = TaskStatus

export type WorkspaceDefaultProjectSemantic = {
	spaceId: string
	projectId: string
}

function cloneWorkspaceLink(link: WorkspaceLinkDto): WorkspaceEntityLink {
	return {
		...link,
	}
}

function cloneWorkspaceLinks(links: WorkspaceLinkDto[]): WorkspaceEntityLink[] {
	return links.map(cloneWorkspaceLink)
}

function cloneWorkspaceCustomFields(customFields: WorkspaceCustomFieldsDto | null): WorkspaceEntityCustomFields | null {
	if (!customFields) return null
	return {
		fields: customFields.fields.map((field) => ({
			...field,
		})),
	}
}

/**
 * 任务实体层保持原始 DTO 语义，只做结构拷贝，不混入展示层逻辑。
 */
export function mapWorkspaceTaskDtoToEntity(task: WorkspaceTaskDto): WorkspaceEntityTask {
	return {
		...task,
		tags: [...task.tags],
		links: cloneWorkspaceLinks(task.links),
		customFields: cloneWorkspaceCustomFields(task.customFields),
	}
}

export function mapWorkspaceTasksDtoToEntities(tasks: WorkspaceTaskDto[]): WorkspaceEntityTask[] {
	return tasks.map(mapWorkspaceTaskDtoToEntity)
}

/**
 * 项目实体层保留 default project 的真实 title/path，未归类文案放到 selector/展示层再处理。
 */
export function mapWorkspaceProjectDtoToEntity(project: WorkspaceProjectDto): WorkspaceEntityProject {
	return {
		...project,
		tags: [...project.tags],
		links: cloneWorkspaceLinks(project.links),
	}
}

export function mapWorkspaceProjectsDtoToEntities(projects: WorkspaceProjectDto[]): WorkspaceEntityProject[] {
	return projects.map(mapWorkspaceProjectDtoToEntity)
}

export function isWorkspaceDefaultProject(projectId: string): boolean {
	return isDefaultProjectId(projectId)
}

export function createWorkspaceDefaultProjectSemantic(spaceId: string): WorkspaceDefaultProjectSemantic {
	return {
		spaceId,
		projectId: getDefaultProjectId(spaceId),
	}
}
