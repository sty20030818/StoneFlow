import type { RemoteSyncCommandReport, RemoteSyncTablesReport } from '@/types/shared/remote-sync'

type RemoteSyncTableKey = keyof RemoteSyncTablesReport

export type RemoteSyncTableViewItem = {
	key: RemoteSyncTableKey
	label: string
	total: number
	synced: number
	deduped: number
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
	const tableValues = Object.values(report.tables)
	const totalSynced = tableValues.reduce((acc, item) => acc + item.synced, 0)
	const totalDeduped = tableValues.reduce((acc, item) => acc + item.deduped, 0)
	const tasksSynced = report.tables.tasks.synced
	const logsSynced = report.tables.taskActivityLogs.synced
	return `任务 ${tasksSynced} 条，日志 ${logsSynced} 条，总写入 ${totalSynced} 条，去重 ${totalDeduped} 条`
}

export function toRemoteSyncTableViewItems(report: RemoteSyncCommandReport): RemoteSyncTableViewItem[] {
	return REMOTE_SYNC_TABLE_ORDER.map((key) => ({
		key,
		label: REMOTE_SYNC_TABLE_LABELS[key],
		total: report.tables[key].total,
		synced: report.tables[key].synced,
		deduped: report.tables[key].deduped,
	}))
}
