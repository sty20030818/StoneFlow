import { PRIORITY_ICON_MAP, PRIORITY_LABELS, PRIORITY_OPTIONS } from '@/config/priority'
import type { ProjectComputedStatusValue, ProjectPriorityValue } from '@/types/domain/project'

export const PROJECT_ICON = 'i-lucide-folder'
export const PROJECT_ROOT_LABEL = 'None (Top Level)'
export const PROJECT_ROOT_ICON_CLASS = 'text-slate-400'
export const PROJECT_UNCATEGORIZED_ICON = 'i-lucide-inbox'
export const PROJECT_UNCATEGORIZED_ICON_CLASS = 'text-slate-400'

export const PROJECT_LEVEL_TEXT_CLASSES = [
	'text-amber-400',
	'text-sky-400',
	'text-violet-400',
	'text-emerald-400',
	'text-rose-400',
]

export const PROJECT_LEVEL_PILL_CLASSES = [
	'bg-amber-500',
	'bg-sky-500',
	'bg-violet-500',
	'bg-emerald-500',
	'bg-rose-500',
]

export const UNCATEGORIZED_LABEL = '未分类'
export const UNKNOWN_PROJECT_LABEL = '未知项目'
export const DEFAULT_PROJECT_ID_SUFFIX = '_default'
export const DEFAULT_PROJECT_LABEL = '未归类'

export function isDefaultProjectId(projectId: string): boolean {
	return projectId.endsWith(DEFAULT_PROJECT_ID_SUFFIX)
}

export const PROJECT_PRIORITY_OPTIONS = PRIORITY_OPTIONS

export const PROJECT_PRIORITY_DISPLAY: Record<
	ProjectPriorityValue,
	{
		label: string
		pillClass: string
		iconName: string
		surfaceVars: Record<string, string>
	}
> = {
	P0: {
		label: PRIORITY_LABELS.P0,
		pillClass: 'bg-red-500 text-white shadow-red-300/70',
		iconName: PRIORITY_ICON_MAP.P0.icon,
		surfaceVars: {
			'--glow-color': '#ef4444',
			'--priority-color-soft': 'rgba(239, 68, 68, 0.12)',
			'--priority-color-pale': 'rgba(239, 68, 68, 0.04)',
			'--priority-color-border': 'rgba(239, 68, 68, 0.4)',
		},
	},
	P1: {
		label: PRIORITY_LABELS.P1,
		pillClass: 'bg-amber-500 text-white shadow-amber-300/70',
		iconName: PRIORITY_ICON_MAP.P1.icon,
		surfaceVars: {
			'--glow-color': '#f59e0b',
			'--priority-color-soft': 'rgba(245, 158, 11, 0.1)',
			'--priority-color-pale': 'rgba(245, 158, 11, 0.03)',
			'--priority-color-border': 'rgba(245, 158, 11, 0.3)',
		},
	},
	P2: {
		label: PRIORITY_LABELS.P2,
		pillClass: 'bg-blue-500 text-white shadow-blue-300/70',
		iconName: PRIORITY_ICON_MAP.P2.icon,
		surfaceVars: {
			'--glow-color': '#3b82f6',
			'--priority-color-soft': 'rgba(59, 130, 246, 0.08)',
			'--priority-color-pale': 'rgba(59, 130, 246, 0.02)',
			'--priority-color-border': 'rgba(59, 130, 246, 0.3)',
		},
	},
	P3: {
		label: PRIORITY_LABELS.P3,
		pillClass: 'bg-slate-500 text-white shadow-slate-300/70',
		iconName: PRIORITY_ICON_MAP.P3.icon,
		surfaceVars: {
			'--glow-color': '#94a3b8',
			'--priority-color-soft': 'rgba(148, 163, 184, 0.1)',
			'--priority-color-pale': 'rgba(148, 163, 184, 0.03)',
			'--priority-color-border': 'rgba(148, 163, 184, 0.3)',
		},
	},
}

export const PROJECT_STATUS_DISPLAY: Record<
	ProjectComputedStatusValue,
	{ label: string; color: 'success' | 'warning' | 'info' | 'neutral'; dot: string }
> = {
	inProgress: { label: 'In Progress', color: 'warning', dot: 'bg-amber-500' },
	done: { label: 'Done', color: 'success', dot: 'bg-emerald-500' },
	archived: { label: 'Archived', color: 'neutral', dot: 'bg-slate-400' },
	deleted: { label: 'Deleted', color: 'neutral', dot: 'bg-slate-500' },
}

export type { ProjectPriorityValue, ProjectComputedStatusValue } from '@/types/domain/project'
