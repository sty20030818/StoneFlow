import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 轻量刷新信号：
 * - 仅用于非数据型 UI 瞬时事件（如过渡期的跨组件提示）
 * - 数据刷新应通过 vue-query invalidation/refetch 完成
 */
export const useRefreshSignalsStore = defineStore('refreshSignals', () => {
	const taskTick = ref(0)
	const projectTick = ref(0)

	function bumpTask() {
		taskTick.value += 1
	}

	function bumpProject() {
		projectTick.value += 1
	}

	return {
		taskTick,
		projectTick,
		bumpTask,
		bumpProject,
	}
})
