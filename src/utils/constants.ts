/**
 * 常量定义
 */

import { SPACE_LABELS } from '@/config/space'
import { TASK_PRIORITY_BADGE_STYLES, type TaskPriorityValue } from '@/config/task'

/**
 * Space 标签映射
 */
export { SPACE_LABELS }

/**
 * 优先级颜色映射
 */
export const PRIORITY_COLORS: Record<TaskPriorityValue, { bg: string; text: string }> = {
	P0: { bg: TASK_PRIORITY_BADGE_STYLES.P0.bgClass, text: TASK_PRIORITY_BADGE_STYLES.P0.textClass },
	P1: { bg: TASK_PRIORITY_BADGE_STYLES.P1.bgClass, text: TASK_PRIORITY_BADGE_STYLES.P1.textClass },
	P2: { bg: TASK_PRIORITY_BADGE_STYLES.P2.bgClass, text: TASK_PRIORITY_BADGE_STYLES.P2.textClass },
	P3: { bg: TASK_PRIORITY_BADGE_STYLES.P3.bgClass, text: TASK_PRIORITY_BADGE_STYLES.P3.textClass },
}
