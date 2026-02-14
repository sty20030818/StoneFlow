import type { RemoteSyncCommandReport, RemoteSyncTablesReport } from '@/types/shared/remote-sync'

type RemoteSyncTableKey = keyof RemoteSyncTablesReport

export type RemoteSyncTableViewItem = {
	key: RemoteSyncTableKey
	label: string
	total: number
	inserted: number
	updated: number
	skipped: number
}

const REMOTE_SYNC_TABLE_LABELS: Record<RemoteSyncTableKey, string> = {
	spaces: '空间',
	projects: '项目',
	tags: '标签',
	links: '关联',
	tasks: '任务',
	taskActivityLogs: '日志',
	taskTags: '任务标签',
	taskLinks: '任务关联',
	projectTags: '项目标签',
	projectLinks: '项目关联',
}

const REMOTE_SYNC_TABLE_ORDER: RemoteSyncTableKey[] = [
	'tasks',
	'taskActivityLogs',
	'spaces',
	'projects',
	'tags',
	'links',
	'taskTags',
	'taskLinks',
	'projectTags',
	'projectLinks',
]

export function summarizeRemoteSyncReport(report: RemoteSyncCommandReport | null, fallback: string) {
	if (!report) return fallback
	const tableValues = Object.values(report.tables).map((item) => normalizeTableReportMetrics(item))
	const totalInserted = tableValues.reduce((acc, item) => acc + item.inserted, 0)
	const totalUpdated = tableValues.reduce((acc, item) => acc + item.updated, 0)
	const totalSkipped = tableValues.reduce((acc, item) => acc + item.skipped, 0)
	const tasksMetrics = normalizeTableReportMetrics(report.tables.tasks)
	const logsMetrics = normalizeTableReportMetrics(report.tables.taskActivityLogs)
	const tasksWrites = tasksMetrics.inserted + tasksMetrics.updated
	const logsWrites = logsMetrics.inserted + logsMetrics.updated
	return `任务 ${tasksWrites} 条，日志 ${logsWrites} 条，总写入 ${totalInserted + totalUpdated} 条，跳过 ${totalSkipped} 条`
}

export function toRemoteSyncTableViewItems(report: RemoteSyncCommandReport): RemoteSyncTableViewItem[] {
	return REMOTE_SYNC_TABLE_ORDER.map((key) => ({
		key,
		label: REMOTE_SYNC_TABLE_LABELS[key],
		...normalizeTableReportMetrics(report.tables[key]),
	}))
}

function normalizeTableReportMetrics(input: unknown) {
	const source = (input ?? {}) as Partial<{
		total: unknown
		inserted: unknown
		updated: unknown
		skipped: unknown
		synced: unknown
		deduped: unknown
	}>
	const total = toSafeNumber(source.total)
	const inserted = toSafeNumber(source.inserted ?? source.synced)
	const updated = toSafeNumber(source.updated)
	const skippedCandidate = source.skipped ?? source.deduped
	const skipped = skippedCandidate === undefined ? Math.max(total - inserted - updated, 0) : toSafeNumber(skippedCandidate)
	return {
		total,
		inserted,
		updated,
		skipped,
	}
}

function toSafeNumber(value: unknown) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	if (typeof value === 'string') {
		const parsed = Number(value)
		if (Number.isFinite(parsed)) return parsed
	}
	return 0
}
