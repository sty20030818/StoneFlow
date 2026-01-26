/**
 * Space 相关工具函数
 */

/**
 * 获取 Space 的显示标签
 * @param spaceId Space ID
 * @returns Space 标签
 */
export function spaceLabel(spaceId: string): string {
	const labels: Record<string, string> = {
		work: 'Work',
		personal: 'Personal',
		study: 'Study',
	}
	return labels[spaceId] ?? spaceId
}
