import { tauriInvoke } from '@/services/tauri/invoke'

export type ProjectDto = {
	id: string
	space_id: string
	parent_id: string | null
	path: string
	name: string
	note: string | null
	status: string
	priority: string
	created_at: number
	updated_at: number
	archived_at: number | null
}

export type ListProjectsArgs = {
	spaceId: string
}

export type CreateProjectArgs = {
	spaceId: string
	name: string
	parentId?: string | null
	note?: string | null
	priority?: string | null
}

/**
 * Project API（封装 Tauri command 名，页面不直接写字符串）。
 */
export async function listProjects(args: ListProjectsArgs): Promise<ProjectDto[]> {
	// Rust: commands/projects.rs -> list_projects
	// Tauri 会自动将 camelCase 转换为 snake_case
	return await tauriInvoke<ProjectDto[]>('list_projects', {
		args: {
			spaceId: args.spaceId,
		},
	})
}

export async function createProject(args: CreateProjectArgs): Promise<ProjectDto> {
	// Rust: commands/projects.rs -> create_project
	// Tauri 会自动将 camelCase 转换为 snake_case
	return await tauriInvoke<ProjectDto>('create_project', {
		args: {
			spaceId: args.spaceId,
			name: args.name,
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
