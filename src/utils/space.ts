/**
 * Space 相关工具函数
 */

import { SPACE_DISPLAY } from '@/config/space'

/**
 * 获取 Space 的显示标签
 * @param spaceId Space ID
 * @returns Space 标签
 */
export function spaceLabel(spaceId: string): string {
	return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.label ?? spaceId
}
