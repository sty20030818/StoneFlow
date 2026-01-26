/**
 * Task 相关工具函数
 * 包括状态映射、排序等
 */

export type TaskStatus = 'todo' | 'doing' | 'paused' | 'done' | 'abandoned'

export type DisplayStatus = 'todo' | 'doing' | 'done'

/**
 * 将后端状态映射到前端显示状态
 * @param status 后端状态值
 * @returns 前端显示状态（todo/doing/done）
 */
export function getDisplayStatus(status: string | undefined | null): DisplayStatus {
	if (!status) return 'todo'

	const s = status.toLowerCase()
	if (s === 'todo' || s === 'not_started' || s === 'planned') {
		return 'todo'
	}
	if (s === 'doing' || s === 'in_progress' || s === 'paused') {
		return 'doing'
	}
	if (s === 'done' || s === 'completed' || s === 'abandoned') {
		return 'done'
	}

	// 默认返回 todo
	return 'todo'
}

/**
 * 获取状态分组（用于列表排序和分组）
 * @param status 后端状态值
 * @returns 状态分组（todo/doing/done）
 */
export function getStatusGroup(status: string | undefined | null): DisplayStatus {
	return getDisplayStatus(status)
}

/**
 * 获取状态排序值（用于列表排序）
 * paused 排在 doing 最后，abandoned 排在 done 最后
 * @param status 后端状态值
 * @returns 排序值（数字越小越靠前）
 */
export function getStatusSortOrder(status: string | undefined | null): number {
	if (!status) return 0

	const s = status.toLowerCase()

	// todo 组：0-99
	if (s === 'todo' || s === 'not_started' || s === 'planned') {
		return 10
	}

	// doing 组：100-199
	if (s === 'doing' || s === 'in_progress') {
		return 100
	}
	if (s === 'paused') {
		return 199 // 排在 doing 最后
	}

	// done 组：200-299
	if (s === 'done' || s === 'completed') {
		return 200
	}
	if (s === 'abandoned') {
		return 299 // 排在 done 最后
	}

	return 0
}

/**
 * 判断是否为暂停状态
 * @param status 后端状态值
 * @returns 是否为暂停状态
 */
export function isPaused(status: string | undefined | null): boolean {
	return status?.toLowerCase() === 'paused'
}

/**
 * 判断是否为已放弃状态
 * @param status 后端状态值
 * @returns 是否为已放弃状态
 */
export function isAbandoned(status: string | undefined | null): boolean {
	return status?.toLowerCase() === 'abandoned'
}

/**
 * 状态选项配置（用于 UI 选择器）
 * 只显示三个主要状态
 */
export const statusOptions = [
	{
		value: 'todo',
		label: '待办',
		icon: 'i-lucide-circle',
		iconClass: 'text-slate-400',
	},
	{
		value: 'doing',
		label: '进行中',
		icon: 'i-lucide-play-circle',
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
 * 如果当前是 paused，选择"进行中"时保持 paused
 * 如果当前是 abandoned，选择"已完成"时保持 abandoned
 * @param displayStatus 显示状态（todo/doing/done）
 * @param currentStatus 当前实际状态
 * @returns 后端状态值
 */
export function mapDisplayStatusToBackend(
	displayStatus: DisplayStatus,
	currentStatus: string | undefined | null,
): TaskStatus {
	const current = currentStatus?.toLowerCase()

	if (displayStatus === 'todo') {
		return 'todo'
	}

	if (displayStatus === 'doing') {
		// 如果当前是 paused，保持 paused
		if (current === 'paused') {
			return 'paused'
		}
		return 'doing'
	}

	if (displayStatus === 'done') {
		// 如果当前是 abandoned，保持 abandoned
		if (current === 'abandoned') {
			return 'abandoned'
		}
		return 'done'
	}

	return 'todo'
}

/**
 * 获取状态的显示标签（考虑 paused 和 abandoned）
 * @param status 后端状态值
 * @returns 显示标签
 */
export function getStatusLabel(status: string | undefined | null): string {
	if (!status) return '待办'

	const s = status.toLowerCase()
	if (s === 'paused') return '已暂停'
	if (s === 'abandoned') return '已放弃'
	if (s === 'todo' || s === 'not_started' || s === 'planned') return '待办'
	if (s === 'doing' || s === 'in_progress') return '进行中'
	if (s === 'done' || s === 'completed') return '已完成'

	return '待办'
}
