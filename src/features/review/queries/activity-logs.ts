import { listActivityLogs } from '@/services/api/logs'

import {
	mapInspectorActivityLogsDtoToDomain,
	type InspectorActivityLog,
	type InspectorActivityLogsArgs,
} from '../model'

export type ReviewActivityLogQueryArgs = InspectorActivityLogsArgs

export async function listReviewActivityLogs(args: ReviewActivityLogQueryArgs): Promise<InspectorActivityLog[]> {
	const logs = await listActivityLogs(args)
	return mapInspectorActivityLogsDtoToDomain(logs)
}
