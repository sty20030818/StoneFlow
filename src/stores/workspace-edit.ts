import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type WorkspaceEditHandlers = {
	enterEditMode: () => void
	exitEditMode: () => void
	openDeleteConfirm: () => void
}

/**
 * Workspace 编辑模式桥接：
 * - Header 通过 store 触发页面行为
 * - 页面通过 store 同步当前状态（是否编辑/已选数量）
 */
export const useWorkspaceEditStore = defineStore('workspaceEdit', () => {
	const isEditMode = ref(false)
	const selectedCount = ref(0)
	const handlers = ref<WorkspaceEditHandlers | null>(null)
	const hasHandlers = computed(() => handlers.value !== null)

	function registerHandlers(next: WorkspaceEditHandlers) {
		handlers.value = next
	}

	function clearHandlers() {
		handlers.value = null
		isEditMode.value = false
		selectedCount.value = 0
	}

	function setState(next: { isEditMode: boolean; selectedCount: number }) {
		isEditMode.value = next.isEditMode
		selectedCount.value = next.selectedCount
	}

	function triggerEnterEditMode() {
		handlers.value?.enterEditMode()
	}

	function triggerExitEditMode() {
		handlers.value?.exitEditMode()
	}

	function triggerOpenDeleteConfirm() {
		handlers.value?.openDeleteConfirm()
	}

	return {
		isEditMode,
		selectedCount,
		hasHandlers,
		registerHandlers,
		clearHandlers,
		setState,
		triggerEnterEditMode,
		triggerExitEditMode,
		triggerOpenDeleteConfirm,
	}
})
