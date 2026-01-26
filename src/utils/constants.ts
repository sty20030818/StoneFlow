/**
 * 常量定义
 */

/**
 * Space 标签映射
 */
export const SPACE_LABELS: Record<string, string> = {
	work: 'Work',
	personal: 'Personal',
	study: 'Study',
}

/**
 * 优先级颜色映射
 */
export const PRIORITY_COLORS = {
	P0: { bg: 'bg-red-100', text: 'text-red-600' },
	P1: { bg: 'bg-amber-100', text: 'text-amber-600' },
	P2: { bg: 'bg-blue-100', text: 'text-blue-600' },
	P3: { bg: 'bg-gray-100', text: 'text-gray-600' },
} as const
