import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'

import { DEFAULT_UI_STATE, uiStore, type UiState } from '@/services/tauri/store'

const PROJECT_TREE_EXPANDED_CACHE_KEY = 'ui_project_tree_expanded_v1'

type ProjectTreeNodeLike = {
	id: string
	parentId: string | null
}

export const useProjectTreeStore = defineStore('project-tree', () => {
	const expandedBySpace = useStorage<Record<string, string[]>>(PROJECT_TREE_EXPANDED_CACHE_KEY, {})
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)
	const persistTimer = ref<ReturnType<typeof setTimeout> | null>(null)

	function getAncestorIds(projectId: string, projects: readonly ProjectTreeNodeLike[]) {
		const byId = new Map(projects.map((p) => [p.id, p]))
		const ancestors: string[] = []
		let current = byId.get(projectId)
		while (current?.parentId) {
			ancestors.unshift(current.parentId)
			current = byId.get(current.parentId)
		}
		return ancestors
	}

	async function loadInternal() {
		const val = await uiStore.get<UiState>('ui')
		if (val?.projectTreeExpanded) {
			expandedBySpace.value = val.projectTreeExpanded
		}
		loaded.value = true
	}

	async function load(options: { force?: boolean } = {}) {
		const { force = false } = options
		if (force) {
			loaded.value = false
		}
		if (loaded.value) return
		if (loadingPromise.value) {
			return await loadingPromise.value
		}
		loadingPromise.value = (async () => {
			try {
				await loadInternal()
			} finally {
				loadingPromise.value = null
			}
		})()
		return await loadingPromise.value
	}

	function getExpanded(spaceId: string) {
		return expandedBySpace.value[spaceId] ?? []
	}

	function resolveExpandedWithAncestors(
		spaceId: string,
		projectId: string | null | undefined,
		projects: readonly ProjectTreeNodeLike[],
	) {
		const base = getExpanded(spaceId)
		if (!projectId || projects.length === 0) return base
		const ancestors = getAncestorIds(projectId, projects)
		if (ancestors.length === 0) return base
		return Array.from(new Set([...base, ...ancestors]))
	}

	function hasMissingAncestorsInExpanded(
		spaceId: string,
		projectId: string | null | undefined,
		projects: readonly ProjectTreeNodeLike[],
	) {
		if (!projectId || projects.length === 0) return false
		const currentExpanded = getExpanded(spaceId)
		const ancestors = getAncestorIds(projectId, projects)
		return ancestors.some((ancestorId) => !currentExpanded.includes(ancestorId))
	}

	function schedulePersistExpandedState() {
		if (persistTimer.value) clearTimeout(persistTimer.value)
		// 折叠展开需要即时反馈，持久化延后批处理，避免点击时主线程抖动。
		persistTimer.value = setTimeout(async () => {
			try {
				const snapshot = { ...expandedBySpace.value }
				const current = (await uiStore.get<UiState>('ui')) ?? DEFAULT_UI_STATE
				await uiStore.set('ui', { ...current, projectTreeExpanded: snapshot })
			} catch (error) {
				console.error('持久化项目树展开状态失败:', error)
			}
		}, 120)
	}

	function setExpanded(spaceId: string, keys: string[]) {
		const prev = expandedBySpace.value[spaceId] ?? []
		if (prev.length === keys.length && prev.every((k, idx) => k === keys[idx])) {
			return
		}
		expandedBySpace.value = {
			...expandedBySpace.value,
			[spaceId]: keys,
		}
		schedulePersistExpandedState()
	}

	function ensureProjectVisible(
		spaceId: string,
		projectId: string | null | undefined,
		projects: readonly ProjectTreeNodeLike[],
	) {
		if (!projectId || projects.length === 0) return
		const nextExpanded = resolveExpandedWithAncestors(spaceId, projectId, projects)
		setExpanded(spaceId, nextExpanded)
	}

	return {
		expandedBySpace,
		loaded,
		load,
		getExpanded,
		resolveExpandedWithAncestors,
		hasMissingAncestorsInExpanded,
		setExpanded,
		ensureProjectVisible,
	}
})
