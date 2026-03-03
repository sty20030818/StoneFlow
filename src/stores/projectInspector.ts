import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { ProjectDto } from '@/features/inspector/model'

export const useProjectInspectorStore = defineStore('projectInspector', () => {
	const isOpen = ref(false)
	const project = ref<ProjectDto | null>(null)

	function open(target: ProjectDto) {
		project.value = target
		isOpen.value = true
	}

	function close() {
		isOpen.value = false
	}

	function setProject(next: ProjectDto | null) {
		project.value = next
	}

	function patchProject(patch: Partial<ProjectDto>) {
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
