import { listTasks } from '@/services/api/tasks'

export type ActivityLogEntityType = 'task' | 'project'

export type ActivityLogEntry = {
	id: string
	entityType: ActivityLogEntityType
	entityId: string
	action: string
	createdAt: number
	spaceId: string
	projectName: string
	detail: string
}

export type ListActivityLogsArgs = {
	entityType?: ActivityLogEntityType
	spaceId?: string
	projectId?: string
	from?: number
	to?: number
}

/**
 * 临时实现：基于 Task 数据构造近似的 ActivityLog 视图。
 * 后续可切换为后端真实 activity_logs 表的查询结果。
 */
export async function listActivityLogs(args: ListActivityLogsArgs = {}): Promise<ActivityLogEntry[]> {
	const tasks = await listTasks({})

	const entries: ActivityLogEntry[] = []

	for (const t of tasks) {
		entries.push({
			id: `${t.id}-created`,
			entityType: 'task',
			entityId: t.id,
			action: 'task_created',
			createdAt: t.createdAt,
			spaceId: t.spaceId,
			projectName: '当前 Space 默认 Project',
			detail: `创建任务「${t.title}」`,
		})

		if (t.completedAt) {
			entries.push({
				id: `${t.id}-completed`,
				entityType: 'task',
				entityId: t.id,
				action: 'task_completed',
				createdAt: t.completedAt,
				spaceId: t.spaceId,
				projectName: '当前 Space 默认 Project',
				detail: `完成任务「${t.title}」`,
			})
		}
	}

	let filtered = entries

	if (args.entityType) {
		filtered = filtered.filter((e) => e.entityType === args.entityType)
	}

	if (args.spaceId) {
		filtered = filtered.filter((e) => e.spaceId === args.spaceId)
	}

	if (args.from !== undefined) {
		const from = args.from
		filtered = filtered.filter((e) => e.createdAt >= from)
	}

	if (args.to !== undefined) {
		const to = args.to
		filtered = filtered.filter((e) => e.createdAt <= to)
	}

	filtered.sort((a, b) => b.createdAt - a.createdAt)

	return filtered
}
