import { computed, type ComputedRef } from 'vue'

import type { WorkspaceProject } from '../shared/model'

/**
 * 从项目列表中按 parentId 回溯，得到 root -> ... -> current 的层级路径。
 */
function projectPath(list: WorkspaceProject[], targetId: string): WorkspaceProject[] {
	const byId = new Map(list.map((project) => [project.id, project]))
	const path: WorkspaceProject[] = []
	let current: WorkspaceProject | undefined = byId.get(targetId)
	while (current) {
		path.unshift(current)
		current = current.parentId ? byId.get(current.parentId) : undefined
	}
	return path
}

/**
 * 生成 ProjectView 场景的面包屑数据。
 */
export function useWorkspaceProjectBreadcrumb(
	spaceId: ComputedRef<string | undefined>,
	projectId: ComputedRef<string | null>,
	projectsList: ComputedRef<WorkspaceProject[]>,
): ComputedRef<Array<{ label: string; to?: string }>> {
	return computed(() => {
		const breadcrumbItems: Array<{ label: string; to?: string }> = []

		if (!projectId.value) {
			return breadcrumbItems
		}

		if (!spaceId.value) {
			breadcrumbItems.push({ label: '…' })
			return breadcrumbItems
		}

		const path = projectPath(projectsList.value, projectId.value)
		if (path.length === 0) {
			breadcrumbItems.push({ label: '…' })
			return breadcrumbItems
		}

		path.forEach((project, index) => {
			const isLast = index === path.length - 1
			breadcrumbItems.push({
				label: project.title,
				...(isLast ? {} : { to: `/space/${spaceId.value}?project=${project.id}` }),
			})
		})

		return breadcrumbItems
	})
}
