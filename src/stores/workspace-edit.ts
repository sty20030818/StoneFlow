import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type WorkspaceEditCommandType = 'enter-edit-mode' | 'exit-edit-mode' | 'open-delete-confirm'

export type WorkspaceEditCommand = {
	id: number
	contextId: string
	type: WorkspaceEditCommandType
	issuedAt: number
}

/**
 * Workspace 编辑模式通道：
 * - Header 通过命令通道派发类型化编辑动作
 * - Workspace 页面作为唯一消费者执行动作并 ACK
 * - 页面同步当前编辑状态（是否编辑/已选数量）供 Header 展示
 */
export const useWorkspaceEditStore = defineStore('workspaceEdit', () => {
	const isEditMode = ref(false)
	const selectedCount = ref(0)
	const activeContextId = ref<string | null>(null)
	const commandSeq = ref(0)
	const pendingCommand = ref<WorkspaceEditCommand | null>(null)
	const hasActiveContext = computed(() => activeContextId.value !== null)

	function resetState() {
		isEditMode.value = false
		selectedCount.value = 0
	}

	function attachContext(contextId: string) {
		activeContextId.value = contextId
		pendingCommand.value = null
		resetState()
	}

	function detachContext(contextId: string) {
		if (activeContextId.value !== contextId) return
		activeContextId.value = null
		pendingCommand.value = null
		resetState()
	}

	function syncState(contextId: string, next: { isEditMode: boolean; selectedCount: number }) {
		if (activeContextId.value !== contextId) return
		isEditMode.value = next.isEditMode
		selectedCount.value = next.selectedCount
	}

	function dispatchCommand(type: WorkspaceEditCommandType) {
		if (!activeContextId.value) return null
		const command: WorkspaceEditCommand = {
			id: commandSeq.value + 1,
			contextId: activeContextId.value,
			type,
			issuedAt: Date.now(),
		}
		commandSeq.value = command.id
		pendingCommand.value = command
		return command
	}

	function acknowledgeCommand(contextId: string, commandId: number) {
		const command = pendingCommand.value
		if (!command) return
		if (command.contextId !== contextId || command.id !== commandId) return
		pendingCommand.value = null
	}

	function clearChannel() {
		activeContextId.value = null
		pendingCommand.value = null
		resetState()
	}

	return {
		isEditMode,
		selectedCount,
		hasActiveContext,
		pendingCommand,
		activeContextId,
		attachContext,
		detachContext,
		syncState,
		dispatchCommand,
		acknowledgeCommand,
		clearChannel,
	}
})
