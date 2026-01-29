import { listTasks } from '@/services/api/tasks'

export type ActivityLogEntityType = 'task' | 'project'

export type ActivityLogEntry = {
	id: string
	entity_type: ActivityLogEntityType
	entity_id: string
	action: string
	created_at: number
	space_id: string
	project_name: string
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
			entity_type: 'task',
			entity_id: t.id,
			action: 'task_created',
			created_at: t.created_at,
			space_id: t.space_id,
			project_name: '当前 Space 默认 Project',
			detail: `创建任务「${t.title}」`,
		})

		if (t.completed_at) {
			entries.push({
				id: `${t.id}-completed`,
				entity_type: 'task',
				entity_id: t.id,
				action: 'task_completed',
				created_at: t.completed_at,
				space_id: t.space_id,
				project_name: '当前 Space 默认 Project',
				detail: `完成任务「${t.title}」`,
			})
		}
	}

	let filtered = entries

	if (args.entityType) {
		filtered = filtered.filter((e) => e.entity_type === args.entityType)
	}

	if (args.spaceId) {
		filtered = filtered.filter((e) => e.space_id === args.spaceId)
	}

	if (args.from !== undefined) {
		const from = args.from
		filtered = filtered.filter((e) => e.created_at >= from)
	}

	if (args.to !== undefined) {
		const to = args.to
		filtered = filtered.filter((e) => e.created_at <= to)
	}

	filtered.sort((a, b) => b.created_at - a.created_at)

	return filtered
}
