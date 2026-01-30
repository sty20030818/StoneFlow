/**
 * Task 相关工具函数
 * 包括状态映射、排序等
 */

export type TaskStatus = 'todo' | 'done'
export type TaskDoneReason = 'completed' | 'cancelled'
export type DisplayStatus = 'todo' | 'done'

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
export const statusOptions = [
	{
		value: 'todo',
		label: '待办',
		icon: 'i-lucide-list-todo',
		iconClass: 'text-blue-500',
	},
	{
		value: 'done',
		label: '已完成',
		icon: 'i-lucide-check-circle-2',
		iconClass: 'text-green-500',
	},
] as const

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
	if (doneReason?.toLowerCase() === 'cancelled') return '已取消'
	return '已完成'
}

/**
 * 获取状态的显示标签
 * @param status 后端状态值
 * @param doneReason 完成原因
 * @returns 显示标签
 */
export function getStatusLabel(status: string | undefined | null, doneReason?: string | null): string {
	if (!status || status.toLowerCase() === 'todo') return '待办'
	return getDoneReasonLabel(doneReason)
}
