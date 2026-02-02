/**
 * Rank 排序工具函数
 * 用于拖拽排序的间隔算法实现
 */

/** 默认步长 */
export const RANK_STEP = 1024

/** 触发无感重排的阈值 */
export const REBALANCE_THRESHOLD = 16

/**
 * 计算插入位置的新 rank
 * @param prevRank 前一个任务的 rank（如果插入第一位则为 null）
 * @param nextRank 后一个任务的 rank（如果插入最后则为 null）
 * @returns { newRank, needsRebalance } newRank 为计算出的 rank，needsRebalance 为是否需要后台重排
 */
export function calculateInsertRank(
	prevRank: number | null,
	nextRank: number | null,
): { newRank: number; needsRebalance: boolean } {
	// 插入空列表
	if (prevRank === null && nextRank === null) {
		return { newRank: 0, needsRebalance: false }
	}

	// 插入最前面
	if (prevRank === null && nextRank !== null) {
		const newRank = Math.floor(nextRank / 2)
		return { newRank, needsRebalance: nextRank < REBALANCE_THRESHOLD }
	}

	// 插入最后面
	if (prevRank !== null && nextRank === null) {
		const newRank = prevRank + RANK_STEP
		return { newRank, needsRebalance: false }
	}

	// 插入中间 - 此时 prevRank 和 nextRank 都已确认不为 null
	const prev = prevRank as number
	const next = nextRank as number
	const gap = next - prev
	const newRank = prev + Math.floor(gap / 2)
	const needsRebalance = gap < REBALANCE_THRESHOLD

	return { newRank, needsRebalance }
}

/**
 * 计算重排后的 rank 列表
 * @param count 任务数量
 * @param step 步长，默认 RANK_STEP
 * @returns rank 数组，按索引对应任务顺序
 */
export function generateRebalancedRanks(count: number, step = RANK_STEP): number[] {
	return Array.from({ length: count }, (_, i) => i * step)
}
