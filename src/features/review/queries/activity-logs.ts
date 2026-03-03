import { listActivityLogs } from '@/services/api/logs'

import type { InspectorActivityLog, InspectorActivityLogsArgs } from '../model'

export type ReviewActivityLogQueryArgs = InspectorActivityLogsArgs

export async function listReviewActivityLogs(args: ReviewActivityLogQueryArgs): Promise<InspectorActivityLog[]> {
	return await listActivityLogs(args)
}
