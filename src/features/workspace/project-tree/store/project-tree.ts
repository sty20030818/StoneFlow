import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

const PROJECT_TREE_EXPANDED_CACHE_KEY = 'ui_project_tree_expanded'
const PROJECT_TREE_EXPANDED_SCHEMA_VERSION = 1

type ProjectTreeExpandedState = {
	schemaVersion: number
	expandedBySpace: Record<string, string[]>
}

type ProjectTreeNodeLike = {
	id: string
	parentId: string | null
}

export const useProjectTreeStore = defineStore('project-tree', () => {
	// 项目树展开状态属于轻量 UI 偏好，只保留本地单一持久化来源。
	const expandedState = useStorage<ProjectTreeExpandedState>(PROJECT_TREE_EXPANDED_CACHE_KEY, {
		schemaVersion: PROJECT_TREE_EXPANDED_SCHEMA_VERSION,
		expandedBySpace: {},
	})
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)

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
		const nextExpandedBySpace =
			expandedState.value?.expandedBySpace && typeof expandedState.value.expandedBySpace === 'object'
				? expandedState.value.expandedBySpace
				: {}
		expandedState.value = {
			schemaVersion: PROJECT_TREE_EXPANDED_SCHEMA_VERSION,
			expandedBySpace: nextExpandedBySpace,
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
		return expandedState.value.expandedBySpace[spaceId] ?? []
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

	function setExpanded(spaceId: string, keys: string[]) {
		const prev = expandedState.value.expandedBySpace[spaceId] ?? []
		if (prev.length === keys.length && prev.every((k, idx) => k === keys[idx])) {
			return
		}
		expandedState.value = {
			schemaVersion: PROJECT_TREE_EXPANDED_SCHEMA_VERSION,
			expandedBySpace: {
				...expandedState.value.expandedBySpace,
				[spaceId]: keys,
			},
		}
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
		expandedBySpace: computed(() => expandedState.value.expandedBySpace),
		loaded,
		load,
		getExpanded,
		resolveExpandedWithAncestors,
		hasMissingAncestorsInExpanded,
		setExpanded,
		ensureProjectVisible,
	}
})
