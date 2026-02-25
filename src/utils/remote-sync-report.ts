import type { RemoteSyncCommandReport, RemoteSyncTablesReport } from '@/types/shared/remote-sync'
import { i18n } from '@/i18n'

type RemoteSyncTableKey = keyof RemoteSyncTablesReport
type TranslateFn = (key: string, params?: Record<string, unknown>) => string

export type RemoteSyncTableViewItem = {
	key: RemoteSyncTableKey
	label: string
	total: number
	inserted: number
	updated: number
	conflicted: number
	skipped: number
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

function resolveTranslate(translate?: TranslateFn): TranslateFn {
	return translate ?? ((key, params) => (params ? i18n.global.t(key, params) : i18n.global.t(key)))
}

export function summarizeRemoteSyncReport(
	report: RemoteSyncCommandReport | null,
	fallback: string,
	translate?: TranslateFn,
) {
	if (!report) return fallback
	const t = resolveTranslate(translate)
	const tableValues = Object.values(report.tables).map((item) => normalizeTableReportMetrics(item))
	const totalInserted = tableValues.reduce((acc, item) => acc + item.inserted, 0)
	const totalUpdated = tableValues.reduce((acc, item) => acc + item.updated, 0)
	const totalConflicted = tableValues.reduce((acc, item) => acc + item.conflicted, 0)
	const totalSkipped = tableValues.reduce((acc, item) => acc + item.skipped, 0)
	const tasksMetrics = normalizeTableReportMetrics(report.tables.tasks)
	const logsMetrics = normalizeTableReportMetrics(report.tables.taskActivityLogs)
	const tasksWrites = tasksMetrics.inserted + tasksMetrics.updated
	const logsWrites = logsMetrics.inserted + logsMetrics.updated
	return t('settings.remoteSync.report.summary', {
		tasks: tasksWrites,
		logs: logsWrites,
		written: totalInserted + totalUpdated,
		conflicted: totalConflicted,
		skipped: totalSkipped,
	})
}

export function toRemoteSyncTableViewItems(
	report: RemoteSyncCommandReport,
	translate?: TranslateFn,
): RemoteSyncTableViewItem[] {
	const t = resolveTranslate(translate)
	return REMOTE_SYNC_TABLE_ORDER.map((key) => ({
		key,
		label: t(`settings.remoteSync.report.tables.${key}`),
		...normalizeTableReportMetrics(report.tables[key]),
	}))
}

function normalizeTableReportMetrics(input: unknown) {
	const source = (input ?? {}) as Partial<{
		total: unknown
		inserted: unknown
		updated: unknown
		conflicted: unknown
		skipped: unknown
		synced: unknown
		deduped: unknown
	}>
	const total = toSafeNumber(source.total)
	const inserted = toSafeNumber(source.inserted ?? source.synced)
	const updated = toSafeNumber(source.updated)
	const conflicted = toSafeNumber(source.conflicted)
	const skippedCandidate = source.skipped ?? source.deduped
	const skipped =
		skippedCandidate === undefined
			? Math.max(total - inserted - updated - conflicted, 0)
			: toSafeNumber(skippedCandidate)
	return {
		total,
		inserted,
		updated,
		conflicted,
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
