/**
 * 优先级相关工具函数
 */

import { TASK_PRIORITY_BADGE_STYLES, type TaskPriorityValue } from '@/config/task'

/**
 * 获取优先级的样式类（用于背景色和文字色）
 * @param priority 优先级（P0, P1, P2, P3）
 * @returns Tailwind CSS 类名
 */
export function getPriorityClass(priority: string | undefined): string {
	const p = (priority || 'P1') as TaskPriorityValue
	const style = TASK_PRIORITY_BADGE_STYLES[p] ?? TASK_PRIORITY_BADGE_STYLES.P1
	return `${style.bgClass} ${style.textClass}`
}

/**
 * 获取优先级的文字样式类（仅文字色，用于简洁显示）
 * @param priority 优先级（P0, P1, P2, P3）
 * @returns Tailwind CSS 类名
 */
export function getPriorityTextClass(priority: string | undefined): string {
	const p = (priority || 'P1') as TaskPriorityValue
	const style = TASK_PRIORITY_BADGE_STYLES[p] ?? TASK_PRIORITY_BADGE_STYLES.P1
	return style.textOnlyClass
}
