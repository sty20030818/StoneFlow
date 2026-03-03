import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { InspectorTask } from '@/features/inspector'

export const useTaskInspectorStore = defineStore('taskInspector', () => {
	const isOpen = ref(false)
	const task = ref<InspectorTask | null>(null)

	function open(target: InspectorTask) {
		task.value = target
		isOpen.value = true
	}

	function close() {
		isOpen.value = false
	}

	function patchTask(patch: Partial<InspectorTask>) {
		if (!task.value) return
		task.value = {
			...task.value,
			...patch,
		}
	}

	return {
		isOpen,
		task,
		open,
		close,
		patchTask,
	}
})
