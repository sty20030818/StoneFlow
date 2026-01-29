import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 页面内联创建聚焦信号：
 * - App 捕获 Cmd+N 时 bump
 * - 内联创建组件 watch tick 后执行 focus
 */
export const useInlineCreateFocusStore = defineStore('inlineCreateFocus', () => {
	const todoFocusTick = ref(0)

	function bumpTodoFocus() {
		todoFocusTick.value += 1
	}

	return {
		todoFocusTick,
		bumpTodoFocus,
	}
})
