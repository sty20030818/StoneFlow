import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { SpaceDto } from '@/services/api/spaces'
import { listSpaces } from '@/services/api/spaces'

/**
 * 每个 Space 的页面状态
 * - route: 路由路径（如 '/space/work'）
 * - projectId: 当前所在的 project ID（如果有）
 */
export type SpacePageState = {
	route: string
	projectId?: string | null
}

export const useSpacesStore = defineStore('spaces', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)
	const spaces = ref<SpaceDto[]>([])
	// 存储每个 space 的页面状态
	const spacePageStates = ref<Map<string, SpacePageState>>(new Map())

	async function loadInternal() {
		spaces.value = await listSpaces()
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

	/**
	 * 保存指定 space 的页面状态
	 */
	function savePageState(spaceId: string, state: SpacePageState) {
		spacePageStates.value.set(spaceId, state)
	}

	/**
	 * 获取指定 space 的页面状态，如果没有则返回默认值
	 */
	function getPageState(spaceId: string): SpacePageState {
		return spacePageStates.value.get(spaceId) ?? { route: `/space/${spaceId}`, projectId: null }
	}

	return {
		loaded,
		spaces,
		load,
		savePageState,
		getPageState,
	}
})
