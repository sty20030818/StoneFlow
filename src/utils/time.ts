/**
 * 时间格式化工具函数
 */

/**
 * 判断时间戳是否为今天（本地时间）
 */
export function isTodayLocal(ts: number | null): boolean {
	if (!ts) return false
	const d = new Date(ts)
	const now = new Date()
	return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

/**
 * 格式化时间戳为相对时间字符串
 * @param timestamp 时间戳（毫秒）
 * @returns 相对时间字符串（Today, Yesterday, X days ago, 或日期）
 */
export function formatTime(timestamp: number): string {
	const date = new Date(timestamp)
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	const days = Math.floor(diff / (1000 * 60 * 60 * 24))

	if (days === 0) return 'Today'
	if (days === 1) return 'Yesterday'
	if (days < 7) return `${days} days ago`
	return date.toLocaleDateString()
}
