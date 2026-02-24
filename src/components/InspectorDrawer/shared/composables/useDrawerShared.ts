import { computed } from 'vue'

import type { DrawerLinkKindOption, DrawerTimelineLogEntry } from '../types'

const ACTION_ICON_MAP: Record<string, string> = {
	task_created: 'i-lucide-circle-plus',
	task_completed: 'i-lucide-check-circle-2',
	task_status_changed: 'i-lucide-refresh-cw',
	task_field_updated: 'i-lucide-pencil-line',
	task_deleted: 'i-lucide-trash-2',
	task_restored: 'i-lucide-undo-2',
	project_created: 'i-lucide-circle-plus',
	project_deleted: 'i-lucide-trash-2',
	project_restored: 'i-lucide-undo-2',
	project_field_updated: 'i-lucide-pencil-line',
	project_archived: 'i-lucide-archive',
	project_unarchived: 'i-lucide-folder-open',
}

export function formatDrawerDateTime(
	ts: number | null | undefined,
	options: { fallback?: string; includeWeekday?: boolean } = {},
): string {
	const fallback = options.fallback ?? '时间未知'
	if (ts === null || ts === undefined) return fallback
	const date = new Date(ts)
	if (Number.isNaN(date.getTime())) return fallback

	const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const

	const yyyy = date.getFullYear()
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')
	const hh = String(date.getHours()).padStart(2, '0')
	const min = String(date.getMinutes()).padStart(2, '0')
	if (options.includeWeekday) {
		const weekday = weekdays[date.getDay()]
		return `${yyyy}.${mm}.${dd} ${weekday} ${hh}:${min}`
	}
	return `${yyyy}.${mm}.${dd} ${hh}:${min}`
}

export function resolveDrawerActivityIcon(action: string): string {
	return ACTION_ICON_MAP[action] ?? 'i-lucide-history'
}

export function useDrawerLinkKindLabelMap(options: () => DrawerLinkKindOption[]) {
	return computed(() => {
		return new Map(options().map((item) => [item.value, item.label]))
	})
}

export type DrawerTimelineUiItem = {
	title: string
	description: string
	date: string
	icon: string
}

export function toDrawerTimelineItems(logs: DrawerTimelineLogEntry[]): DrawerTimelineUiItem[] {
	return logs.map((item) => {
		return {
			title: item.actionLabel,
			description: item.detail || '无详情',
			date: formatDrawerDateTime(item.createdAt),
			icon: resolveDrawerActivityIcon(item.action),
		}
	})
}
