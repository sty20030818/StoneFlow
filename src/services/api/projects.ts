import { tauriInvoke } from '@/services/tauri/invoke'
import type { LinkDto, LinkInput } from '@/services/api/tasks'
import { DEFAULT_PROJECT_LABEL, isDefaultProjectId } from '@/config/project'
import type { ProjectComputedStatusValue, ProjectPriorityValue } from '@/types/domain/project'

export type ProjectDto = {
	id: string
	spaceId: string
	parentId: string | null
	path: string
	title: string
	note: string | null
	priority: ProjectPriorityValue
	todoTaskCount: number
	doneTaskCount: number
	lastTaskUpdatedAt: number | null
	createdAt: number
	updatedAt: number
	archivedAt: number | null
	deletedAt: number | null
	createBy: string
	rank: number
	computedStatus: ProjectComputedStatusValue
	tags: string[]
	links: LinkDto[]
}

export type ListProjectsArgs = {
	spaceId: string
}

export type CreateProjectArgs = {
	spaceId: string
	title: string
	parentId?: string | null
	note?: string | null
	priority?: ProjectPriorityValue | null
	rank?: number | null
	tags?: string[] | null
	links?: LinkInput[] | null
}

export type UpdateProjectPatch = {
	title?: string
	note?: string | null
	priority?: ProjectPriorityValue
	spaceId?: string
	parentId?: string | null
	tags?: string[]
	links?: LinkInput[]
}

function normalizeProjectDto(project: ProjectDto): ProjectDto {
	if (!isDefaultProjectId(project.id)) return project
	return {
		...project,
		title: DEFAULT_PROJECT_LABEL,
		path: `/${DEFAULT_PROJECT_LABEL}`,
	}
}

function normalizeProjectDtos(projects: ProjectDto[]): ProjectDto[] {
	return projects.map(normalizeProjectDto)
}

/**
 * Project API（封装 Tauri command 名，页面不直接写字符串）。
 */
export async function listProjects(args: ListProjectsArgs): Promise<ProjectDto[]> {
	// Rust: commands/projects.rs -> list_projects
	// Rust 侧已使用 camelCase 解析请求字段
	const projects = await tauriInvoke<ProjectDto[]>('list_projects', {
		args: {
			spaceId: args.spaceId,
		},
	})
	return normalizeProjectDtos(projects)
}

export async function listDeletedProjects(args: ListProjectsArgs): Promise<ProjectDto[]> {
	// Rust: commands/projects.rs -> list_deleted_projects
	const projects = await tauriInvoke<ProjectDto[]>('list_deleted_projects', {
		args: {
			spaceId: args.spaceId,
		},
	})
	return normalizeProjectDtos(projects)
}

export async function createProject(args: CreateProjectArgs): Promise<ProjectDto> {
	// Rust: commands/projects.rs -> create_project
	// Rust 侧已使用 camelCase 解析请求字段
	const project = await tauriInvoke<ProjectDto>('create_project', {
		args: {
			spaceId: args.spaceId,
			title: args.title,
			parentId: args.parentId ?? null,
			note: args.note ?? null,
			priority: args.priority ?? null,
			rank: args.rank ?? null,
			tags: args.tags ?? null,
			links: args.links ?? null,
		},
	})
	return normalizeProjectDto(project)
}

export async function updateProject(projectId: string, patch: UpdateProjectPatch): Promise<void> {
	await tauriInvoke<void>('update_project', {
		args: {
			projectId,
			patch: {
				title: patch.title,
				note: patch.note === undefined ? undefined : patch.note,
				priority: patch.priority,
				spaceId: patch.spaceId,
				parentId: patch.parentId === undefined ? undefined : patch.parentId,
				tags: patch.tags,
				links: patch.links,
			},
		},
	})
}

export async function getDefaultProject(spaceId: string): Promise<ProjectDto> {
	// Rust: commands/projects.rs -> get_default_project
	// Tauri 会自动将 camelCase 转换为 snake_case
	// 注意：Default Project 应该在数据库初始化时创建，如果不存在则返回错误
	const project = await tauriInvoke<ProjectDto>('get_default_project', {
		spaceId,
	})
	return normalizeProjectDto(project)
}

export async function deleteProject(projectId: string): Promise<void> {
	// Rust: commands/projects.rs -> delete_project
	await tauriInvoke<void>('delete_project', {
		args: {
			projectId,
		},
	})
}

export async function restoreProject(projectId: string): Promise<void> {
	// Rust: commands/projects.rs -> restore_project
	await tauriInvoke<void>('restore_project', {
		args: {
			projectId,
		},
	})
}

export async function archiveProject(projectId: string): Promise<void> {
	// Rust: commands/projects.rs -> archive_project
	await tauriInvoke<void>('archive_project', {
		args: {
			projectId,
		},
	})
}

export async function unarchiveProject(projectId: string): Promise<void> {
	// Rust: commands/projects.rs -> unarchive_project
	await tauriInvoke<void>('unarchive_project', {
		args: {
			projectId,
		},
	})
}

/**
 * 更新项目的 rank（和可选的 parentId）用于拖拽排序
 */
export async function reorderProject(projectId: string, newRank: number, newParentId?: string | null): Promise<void> {
	await tauriInvoke<void>('reorder_project', {
		args: {
			projectId,
			newRank,
			newParentId: newParentId !== undefined ? newParentId : undefined,
		},
	})
}

/**
 * 批量重排项目 rank（用于阈值触发的无感重排）
 * @param projectIds 按顺序排列的项目 ID 列表
 * @param step 步长，默认 1024
 */
export async function rebalanceProjectRanks(projectIds: string[], step = 1024): Promise<void> {
	await tauriInvoke<void>('rebalance_project_ranks', {
		args: { projectIds, step },
	})
}
