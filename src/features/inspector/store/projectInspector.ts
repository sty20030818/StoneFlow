import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { InspectorProject } from '@/features/inspector'

// Inspector 项目抽屉状态是 feature 级共享状态，统一收口到 inspector feature 内部。
export const useProjectInspectorStore = defineStore('projectInspector', () => {
	const isOpen = ref(false)
	const project = ref<InspectorProject | null>(null)

	function open(target: InspectorProject) {
		project.value = target
		isOpen.value = true
	}

	function close() {
		isOpen.value = false
	}

	function setProject(next: InspectorProject | null) {
		project.value = next
	}

	function patchProject(patch: Partial<InspectorProject>) {
		if (!project.value) return
		project.value = {
			...project.value,
			...patch,
		}
	}

	return {
		isOpen,
		project,
		open,
		close,
		setProject,
		patchProject,
	}
})
