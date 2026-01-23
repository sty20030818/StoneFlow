import { tauriInvoke } from '@/services/tauri/invoke'

export type ProjectDto = {
	id: string
	space_id: string
	parent_id: string | null
	path: string
	name: string
	note: string | null
	status: string
	created_at: number
	updated_at: number
	archived_at: number | null
}

export type ListProjectsArgs = {
	spaceId: string
}

/**
 * Project API（封装 Tauri command 名，页面不直接写字符串）。
 */
export async function listProjects(args: ListProjectsArgs): Promise<ProjectDto[]> {
	// Rust: commands/projects.rs -> list_projects
	return await tauriInvoke<ProjectDto[]>('list_projects', {
		args: {
			spaceId: args.spaceId,
		},
	})
}
