/**
 * 优先级相关工具函数
 */

/**
 * 获取优先级的样式类（用于背景色和文字色）
 * @param priority 优先级（P0, P1, P2, P3）
 * @returns Tailwind CSS 类名
 */
export function getPriorityClass(priority: string | undefined): string {
	const p = priority || 'P1'
	if (p === 'P0') return 'bg-red-100 text-red-600'
	if (p === 'P2') return 'bg-blue-100 text-blue-600'
	return 'bg-amber-100 text-amber-600' // P1 default
}

/**
 * 获取优先级的文字样式类（仅文字色，用于简洁显示）
 * @param priority 优先级（P0, P1, P2, P3）
 * @returns Tailwind CSS 类名
 */
export function getPriorityTextClass(priority: string | undefined): string {
	const p = priority || 'P1'
	if (p === 'P0') return 'text-red-600'
	if (p === 'P2') return 'text-blue-600'
	return 'text-muted' // P1 default
}
