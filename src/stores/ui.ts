import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
	const selectedProjectId = ref<string | null>(null)
	const selectedTaskId = ref<string | null>(null)
	const sidebarCollapsed = ref(false)
	const detailPanelExpanded = ref(true)

	function selectProject(projectId: string | null) {
		selectedProjectId.value = projectId
	}

	function selectTask(taskId: string | null) {
		selectedTaskId.value = taskId
	}

	function toggleSidebar() {
		sidebarCollapsed.value = !sidebarCollapsed.value
	}

	function toggleDetailPanel() {
		detailPanelExpanded.value = !detailPanelExpanded.value
	}

	return {
		selectedProjectId,
		selectedTaskId,
		sidebarCollapsed,
		detailPanelExpanded,
		selectProject,
		selectTask,
		toggleSidebar,
		toggleDetailPanel,
	}
})
