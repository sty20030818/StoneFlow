import { tauriInvoke } from '@/services/tauri/invoke'
import type { LinkDto } from '@/services/api/tasks'
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
}

/**
 * Project API（封装 Tauri command 名，页面不直接写字符串）。
 */
export async function listProjects(args: ListProjectsArgs): Promise<ProjectDto[]> {
	// Rust: commands/projects.rs -> list_projects
	// Rust 侧已使用 camelCase 解析请求字段
	return await tauriInvoke<ProjectDto[]>('list_projects', {
		args: {
			spaceId: args.spaceId,
		},
	})
}

export async function createProject(args: CreateProjectArgs): Promise<ProjectDto> {
	// Rust: commands/projects.rs -> create_project
	// Rust 侧已使用 camelCase 解析请求字段
	return await tauriInvoke<ProjectDto>('create_project', {
		args: {
			spaceId: args.spaceId,
			title: args.title,
			parentId: args.parentId ?? null,
			note: args.note ?? null,
			priority: args.priority ?? null,
		},
	})
}

export async function getDefaultProject(spaceId: string): Promise<ProjectDto> {
	// Rust: commands/projects.rs -> get_default_project
	// Tauri 会自动将 camelCase 转换为 snake_case
	// 注意：Default Project 应该在数据库初始化时创建，如果不存在则返回错误
	return await tauriInvoke<ProjectDto>('get_default_project', {
		spaceId,
	})
}
