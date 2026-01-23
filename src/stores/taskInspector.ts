import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { TaskDto } from '@/services/api/tasks'

export const useTaskInspectorStore = defineStore('taskInspector', () => {
	const isOpen = ref(false)
	const task = ref<TaskDto | null>(null)

	function open(target: TaskDto) {
		task.value = target
		isOpen.value = true
	}

	function close() {
		isOpen.value = false
	}

	function patchTask(patch: Partial<TaskDto>) {
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

