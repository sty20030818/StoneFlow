import { listActivityLogs, type ListActivityLogsArgs } from '@/services/api/logs'

import { mapInspectorActivityLogsDtoToDomain, type InspectorActivityLog, type InspectorActivityLogsArgs } from '../model'

export async function listInspectorActivityLogs(args: InspectorActivityLogsArgs): Promise<InspectorActivityLog[]> {
	const logs = await listActivityLogs(args as ListActivityLogsArgs)
	return mapInspectorActivityLogsDtoToDomain(logs)
}
