import { readonly, ref } from 'vue'
import type { Router } from 'vue-router'

import { SPACE_IDS } from '@/config/space'
import { resolveFallbackTarget, resolveStartupTarget, STARTUP_FALLBACK_SPACE_ID } from '@/startup/session-snapshot'
import { useProjectTreeStore } from '@/stores/project-tree'
import { useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'
import { useViewStateStore } from '@/stores/view-state'
import type { LaunchIntent } from '@/types/shared/settings'

let startupPromise: Promise<void> | null = null
const startupReady = ref(false)

function isKnownSpaceId(value: string): value is (typeof SPACE_IDS)[number] {
	return SPACE_IDS.includes(value as (typeof SPACE_IDS)[number])
}

function normalizeSpaceId(value: string | null | undefined): (typeof SPACE_IDS)[number] {
	if (typeof value === 'string' && isKnownSpaceId(value)) {
		return value
	}
	return STARTUP_FALLBACK_SPACE_ID
}

function resolveValidatedStartupTarget(
	router: Router,
	target: { path: string; query?: Record<string, string> },
	fallbackSpaceId: string,
) {
	const resolvedTarget = router.resolve(target)
	if (resolvedTarget.matched.length > 0) {
		return target
	}

	const fallbackTarget = resolveFallbackTarget(fallbackSpaceId)
	const resolvedFallback = router.resolve(fallbackTarget)
	if (resolvedFallback.matched.length > 0) {
		return fallbackTarget
	}

	return resolveFallbackTarget(STARTUP_FALLBACK_SPACE_ID)
}

function extractCurrentSpaceId(router: Router, fallbackSpaceId: (typeof SPACE_IDS)[number]) {
	const sid = router.currentRoute.value.params.spaceId
	if (typeof sid === 'string' && isKnownSpaceId(sid)) {
		return sid
	}
	return fallbackSpaceId
}

export function useStartupReady() {
	return readonly(startupReady)
}

export type InitializeStartupOptions = {
	launchHashAtBoot: string
}

export async function initializeAppStartup(router: Router, options: InitializeStartupOptions): Promise<void> {
	if (startupPromise) return startupPromise

	startupPromise = (async () => {
		startupReady.value = false
		const settingsStore = useSettingsStore()
		const projectsStore = useProjectsStore()
		const viewStateStore = useViewStateStore()
		const projectTreeStore = useProjectTreeStore()

		const activeSpaceId = normalizeSpaceId(settingsStore.settings.activeSpaceId)
		const snapshot = viewStateStore.getStartupSnapshot() ?? viewStateStore.migrateLegacySnapshot(activeSpaceId)
		const launchIntent: LaunchIntent = {
			hashAtBoot: options.launchHashAtBoot,
			isFirstRun: snapshot === null,
		}
		const startupTarget = resolveStartupTarget(snapshot, launchIntent)

		await router.isReady()

		const validatedTarget = resolveValidatedStartupTarget(
			router,
			startupTarget,
			snapshot?.activeSpaceId ?? activeSpaceId,
		)
		const validatedFullPath = router.resolve(validatedTarget).fullPath
		if (validatedFullPath !== router.currentRoute.value.fullPath) {
			await router.replace(validatedTarget)
		}

		startupReady.value = true
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
		startupReady.value = true
	})

	return startupPromise
}
