/**
 * Task 相关工具函数
 * 包括状态映射、排序等
 */

import {
	TASK_DONE_REASON_LABELS,
	TASK_STATUS_LABELS,
	TASK_STATUS_OPTIONS,
	type TaskDoneReasonValue,
	type TaskStatusValue,
} from '@/config/task'

export type TaskStatus = TaskStatusValue
export type TaskDoneReason = TaskDoneReasonValue
export type DisplayStatus = TaskStatusValue

/**
 * 将后端状态映射到前端显示状态
 * @param status 后端状态值
 * @returns 前端显示状态（todo/done）
 */
export function getDisplayStatus(status: string | undefined | null): DisplayStatus {
	if (!status) return 'todo'
	return status.toLowerCase() === 'done' ? 'done' : 'todo'
}

/**
 * 获取状态排序值（用于列表排序）
 * @param status 后端状态值
 * @returns 排序值（数字越小越靠前）
 */
export function getStatusSortOrder(status: string | undefined | null): number {
	return status?.toLowerCase() === 'done' ? 100 : 0
}

/**
 * 状态选项配置（用于 UI 选择器）
 */
export const statusOptions = [...TASK_STATUS_OPTIONS] as const

/**
 * 根据显示状态选择器选择的值，映射到实际的后端状态值
 * @param displayStatus 显示状态（todo/done）
 * @returns 后端状态值
 */
export function mapDisplayStatusToBackend(displayStatus: DisplayStatus): TaskStatus {
	return displayStatus
}

/**
 * 获取完成原因标签
 */
export function getDoneReasonLabel(doneReason: string | undefined | null): string {
	const key = doneReason?.toLowerCase() as TaskDoneReasonValue | undefined
	if (!key) return TASK_DONE_REASON_LABELS.completed
	return TASK_DONE_REASON_LABELS[key] ?? TASK_DONE_REASON_LABELS.completed
}

/**
 * 获取状态的显示标签
 * @param status 后端状态值
 * @param doneReason 完成原因
 * @returns 显示标签
 */
export function getStatusLabel(status: string | undefined | null, doneReason?: string | null): string {
	if (!status || status.toLowerCase() === 'todo') return TASK_STATUS_LABELS.todo
	return getDoneReasonLabel(doneReason)
}
