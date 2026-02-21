import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { ProjectDto } from '@/services/api/projects'

export type ProjectInspectorSaveState = 'idle' | 'saving' | 'saved' | 'error'

export const useProjectInspectorStore = defineStore('projectInspector', () => {
	const isOpen = ref(false)
	const project = ref<ProjectDto | null>(null)
	const saveState = ref<ProjectInspectorSaveState>('idle')
	const retrySaveAvailable = ref(false)

	function open(target: ProjectDto) {
		project.value = target
		isOpen.value = true
		saveState.value = 'idle'
		retrySaveAvailable.value = false
	}

	function close() {
		isOpen.value = false
		saveState.value = 'idle'
		retrySaveAvailable.value = false
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

	function setSaveState(next: ProjectInspectorSaveState) {
		saveState.value = next
	}

	function setRetrySaveAvailable(next: boolean) {
		retrySaveAvailable.value = next
	}

	return {
		isOpen,
		project,
		saveState,
		retrySaveAvailable,
		open,
		close,
		setProject,
		patchProject,
		setSaveState,
		setRetrySaveAvailable,
	}
})
