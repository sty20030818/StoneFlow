import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 轻量刷新信号：
 * - 写操作成功后 bump
 * - 展示层 watch tick 并触发既有 refresh/load
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

