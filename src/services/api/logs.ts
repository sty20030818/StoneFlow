import { tauriInvoke } from '@/services/tauri/invoke'

export type ActivityLogEntityType = 'task' | 'project'

export type ActivityLogEntry = {
	id: string
	entityType: ActivityLogEntityType
	entityId: string
	action: string
	actionLabel: string
	fieldKey: string | null
	fieldLabel: string | null
	beforeValue: string | null
	afterValue: string | null
	createdAt: number
	spaceId: string
	projectId: string | null
	projectName: string
	detail: string
}

export type ListActivityLogsArgs = {
	entityType?: ActivityLogEntityType
	taskId?: string
	spaceId?: string
	projectId?: string
	from?: number
	to?: number
	limit?: number
	offset?: number
}

type ActivityLogDto = {
	id: string
	entityType: string
	entityId: string
	action: string
	actionLabel: string
	fieldKey: string | null
	fieldLabel: string | null
	beforeValue: string | null
	afterValue: string | null
	detail: string
	createdAt: number
	spaceId: string
	projectId: string | null
	projectName: string
}

function normalizeEntityType(value: string): ActivityLogEntityType {
	return value === 'project' ? 'project' : 'task'
}

export async function listActivityLogs(args: ListActivityLogsArgs = {}): Promise<ActivityLogEntry[]> {
	const logs = await tauriInvoke<ActivityLogDto[]>('list_activity_logs', {
		args: {
			entityType: args.entityType,
			taskId: args.taskId,
			spaceId: args.spaceId,
			projectId: args.projectId,
			from: args.from,
			to: args.to,
			limit: args.limit,
			offset: args.offset,
		},
	})

	return logs.map((item) => ({
		id: item.id,
		entityType: normalizeEntityType(item.entityType),
		entityId: item.entityId,
		action: item.action,
		actionLabel: item.actionLabel,
		fieldKey: item.fieldKey,
		fieldLabel: item.fieldLabel,
		beforeValue: item.beforeValue,
		afterValue: item.afterValue,
		detail: item.detail,
		createdAt: item.createdAt,
		spaceId: item.spaceId,
		projectId: item.projectId,
		projectName: item.projectName || '当前 Space 默认 Project',
	}))
}
