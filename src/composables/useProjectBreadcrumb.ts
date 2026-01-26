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
 * @param defaultProject Default Project（可选）
 * @param projectsList 项目列表
 * @param hasExplicitProject 是否有明确的 project 查询参数
 */
export function useProjectBreadcrumb(
	spaceId: ComputedRef<string | undefined>,
	projectId: ComputedRef<string | null>,
	defaultProject: { value: ProjectDto | null },
	projectsList: ComputedRef<ProjectDto[]>,
	hasExplicitProject: ComputedRef<boolean>,
): ComputedRef<Array<{ label: string; to?: string }>> {
	return computed(() => {
		const base: { label: string; to?: string }[] = []

		// All Tasks 模式
		if (!spaceId.value) {
			base.push({ label: 'All Tasks' })
			return base
		}

		// Project 模式
		const pid = projectId.value
		if (!pid) return base

		if (hasExplicitProject.value) {
			// 有明确的 project 参数，构建完整路径
			const list = projectsList.value
			const path = projectPath(list, pid)
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
		} else {
			// 使用 default project
			base.push({ label: defaultProject.value?.name ?? '…' })
		}
		return base
	})
}
