import { computed, type ComputedRef } from 'vue'

import type { ProjectDto } from '@/services/api/projects'

/**
 * 从 project 列表按 parent_id 回溯，得到 root → … → current 的层级路径
 */
function projectPath(list: ProjectDto[], targetId: string): ProjectDto[] {
	const byId = new Map(list.map((p) => [p.id, p]))
	const out: ProjectDto[] = []
	let curr: ProjectDto | undefined = byId.get(targetId)
	while (curr) {
		out.unshift(curr)
		curr = curr.parent_id ? byId.get(curr.parent_id) : undefined
	}
	return out
}

/**
 * 生成项目面包屑导航项
 * @param spaceId Space ID（可选，All Tasks 模式为 undefined）
 * @param projectId Project ID（可选）
 * @param projectsList 项目列表
 */
export function useProjectBreadcrumb(
	spaceId: ComputedRef<string | undefined>,
	projectId: ComputedRef<string | null>,
	projectsList: ComputedRef<ProjectDto[]>,
): ComputedRef<Array<{ label: string; to?: string }>> {
	return computed(() => {
		const base: { label: string; to?: string }[] = []

		// All Tasks 模式
		if (!projectId.value) {
			base.push({ label: 'All Tasks' })
			return base
		}

		if (!spaceId.value) {
			base.push({ label: '…' })
			return base
		}

		// Project 模式：构建完整路径
		const list = projectsList.value
		const path = projectPath(list, projectId.value)
		if (path.length) {
			for (let i = 0; i < path.length; i++) {
				const p = path[i]
				const isLast = i === path.length - 1
				base.push({
					label: p.name,
					...(isLast ? {} : { to: `/space/${spaceId.value}?project=${p.id}` }),
				})
			}
		} else {
			base.push({ label: '…' })
		}
		return base
	})
}
