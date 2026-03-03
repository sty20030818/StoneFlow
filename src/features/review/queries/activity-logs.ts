import { listActivityLogs } from '@/services/api/logs'

import type { ActivityLogEntry, ListActivityLogsArgs } from '../model'

export type ReviewActivityLogQueryArgs = ListActivityLogsArgs

export async function listReviewActivityLogs(args: ReviewActivityLogQueryArgs): Promise<ActivityLogEntry[]> {
	return await listActivityLogs(args)
}
