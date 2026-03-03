import { listActivityLogs, type ActivityLogEntry, type ListActivityLogsArgs } from '@/services/api/logs'

export type InspectorActivityLogsArgs = ListActivityLogsArgs

export async function listInspectorActivityLogs(args: InspectorActivityLogsArgs): Promise<ActivityLogEntry[]> {
	return await listActivityLogs(args)
}
