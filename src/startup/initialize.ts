import type { LocationQuery, Router } from 'vue-router'

import { SPACE_IDS } from '@/config/space'
import { useProjectTreeStore } from '@/stores/project-tree'
import { useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'
import { useViewStateStore } from '@/stores/view-state'
import type { LastViewState } from '@/types/shared/settings'

let startupPromise: Promise<void> | null = null

function isKnownSpaceId(value: string): boolean {
	return (SPACE_IDS as readonly string[]).includes(value)
}

function hasExplicitHashPath(): boolean {
	const hashPath = window.location.hash.replace(/^#/, '')
	return hashPath.length > 0 && hashPath !== '/'
}

function normalizeQuery(projectId: string | null | undefined): LocationQuery {
	if (!projectId) return {}
	return { project: projectId }
}

function resolveFallbackPath(spaceId: string) {
	return {
		path: `/space/${spaceId}`,
		query: {},
	}
}

function resolveLastViewPath(router: Router, spaceId: string, lastView: LastViewState | undefined) {
	if (!lastView?.route) {
		return resolveFallbackPath(spaceId)
	}

	const query = normalizeQuery(lastView.projectId)
	const resolved = router.resolve({ path: lastView.route, query })
	if (resolved.matched.length === 0) {
		return resolveFallbackPath(spaceId)
	}
	const resolvedSpaceId = resolved.params.spaceId
	// 仅允许恢复到当前 Space 对应的 workspace 路由，避免“路由在 A、侧栏在 B”的错位。
	if (typeof resolvedSpaceId === 'string' && resolvedSpaceId !== spaceId) {
		return resolveFallbackPath(spaceId)
	}

	return { path: resolved.path, query }
}

function extractCurrentSpaceId(router: Router, fallbackSpaceId: string): string {
	const sid = router.currentRoute.value.params.spaceId
	if (typeof sid === 'string' && isKnownSpaceId(sid)) {
		return sid
	}
	return fallbackSpaceId
}

export async function initializeAppStartup(router: Router): Promise<void> {
	if (startupPromise) return startupPromise

	startupPromise = (async () => {
		const settingsStore = useSettingsStore()
		const projectsStore = useProjectsStore()
		const viewStateStore = useViewStateStore()
		const projectTreeStore = useProjectTreeStore()

		await router.isReady()

		// 首屏优先使用本地快照，避免挂载前等待 Tauri Store
		const activeSpaceId = settingsStore.settings.activeSpaceId ?? 'work'
		if (!hasExplicitHashPath()) {
			const lastView = viewStateStore.getLastView(activeSpaceId)
			const restoreTarget = resolveLastViewPath(router, activeSpaceId, lastView)
			const restoreResolved = router.resolve(restoreTarget)

			if (restoreResolved.fullPath !== router.currentRoute.value.fullPath) {
				await router.replace(restoreTarget)
			}
		}

		const visibleSpaceId = extractCurrentSpaceId(router, activeSpaceId)
		// 其余状态与数据后台并发，避免阻塞挂载
		void Promise.allSettled([
			settingsStore.load(),
			viewStateStore.load(),
			projectTreeStore.load(),
			projectsStore.load(visibleSpaceId),
		])
	})().finally(() => {
		startupPromise = null
	})

	return startupPromise
}
