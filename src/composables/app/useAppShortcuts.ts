import { useEventListener } from '@vueuse/core'
import { toValue, type MaybeRefOrGetter } from 'vue'

type AppShortcutOptions = {
	routePath: MaybeRefOrGetter<string>
}

type AppShortcutActions = {
	toggleCommandPalette: () => void
	openCreateProject: () => void
	openCreateTask: () => void
	focusInlineTaskCreator: () => void
}

function isEditableTarget(target: EventTarget | null) {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		(target as HTMLElement | null)?.isContentEditable
	)
}

function isInteractiveTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false
	const tag = target.tagName
	return tag === 'BUTTON' || tag === 'A' || tag === 'SELECT' || target.getAttribute('role') === 'button'
}

function isWorkspaceRoute(path: string) {
	return path === '/all-tasks' || path.startsWith('/space/')
}

function hasPrimaryModifier(event: KeyboardEvent) {
	return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey
}

export function useAppShortcuts(options: AppShortcutOptions, actions: AppShortcutActions) {
	function handleKeydown(event: KeyboardEvent) {
		if (event.isComposing) return
		const key = event.key.toLowerCase()

		// ⌘K / Ctrl+K: 打开命令面板
		if (hasPrimaryModifier(event) && key === 'k') {
			event.preventDefault()
			actions.toggleCommandPalette()
			return
		}

		// ⌘N / Ctrl+N: 新建 Project
		if (hasPrimaryModifier(event) && key === 'n') {
			if (isEditableTarget(event.target)) return
			event.preventDefault()
			actions.openCreateProject()
			return
		}

		// ⌘T / Ctrl+T: 新建 Task
		if (hasPrimaryModifier(event) && key === 't') {
			if (isEditableTarget(event.target)) return
			event.preventDefault()
			actions.openCreateTask()
			return
		}

		// Enter: Workspace 页面触发内联创建聚焦
		if (key === 'enter') {
			if (isEditableTarget(event.target) || isInteractiveTarget(event.target)) return
			if (!isWorkspaceRoute(toValue(options.routePath))) return
			event.preventDefault()
			actions.focusInlineTaskCreator()
		}
	}

	useEventListener(window, 'keydown', handleKeydown)

	return {
		handleKeydown,
	}
}
