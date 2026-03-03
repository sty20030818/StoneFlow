import { useTimeoutFn } from '@vueuse/core'
import { ref } from 'vue'

import type { DrawerSaveState } from './useDrawerSaveStatePresentation'

type PatchQueueBucket<TPatch> = {
	stagedPatch: TPatch
	queueRunning: boolean
}

export function usePatchQueue<TContextId extends string, TPatch>(options: {
	createEmptyPatch: () => TPatch
	hasPatchValue: (patch: TPatch) => boolean
	mergePatch: (current: TPatch, next: TPatch) => TPatch
	clonePatch: (patch: TPatch) => TPatch
	commitPatch: (contextId: TContextId, patch: TPatch) => Promise<boolean>
	isContextActive?: (contextId: TContextId) => boolean
	onDiscardedPatch?: (contextId: TContextId, patch: TPatch) => void
	savedResetMs?: number
	errorResetMs?: number
}) {
	const saveState = ref<DrawerSaveState>('idle')
	const retrySaveAvailable = ref(false)
	const activeContextId = ref<TContextId | null>(null)
	const pendingSaves = ref(0)

	const bucketByContext = new Map<TContextId, PatchQueueBucket<TPatch>>()
	const retryPatchByContext = new Map<TContextId, TPatch>()

	const { start: startSavedTimer, stop: stopSavedTimer } = useTimeoutFn(
		() => {
			saveState.value = 'idle'
		},
		options.savedResetMs ?? 1200,
		{ immediate: false },
	)
	const { start: startErrorTimer, stop: stopErrorTimer } = useTimeoutFn(
		() => {
			saveState.value = 'idle'
		},
		options.errorResetMs ?? 3000,
		{ immediate: false },
	)

	function clearSaveStateTimer() {
		stopSavedTimer()
		stopErrorTimer()
	}

	function beginSave() {
		pendingSaves.value += 1
		saveState.value = 'saving'
		clearSaveStateTimer()
	}

	function endSave(ok: boolean) {
		pendingSaves.value = Math.max(0, pendingSaves.value - 1)
		if (pendingSaves.value > 0) return
		clearSaveStateTimer()
		if (ok) {
			saveState.value = 'saved'
			startSavedTimer()
			return
		}
		saveState.value = 'error'
		startErrorTimer()
	}

	function syncRetrySaveAvailability() {
		const contextId = activeContextId.value
		retrySaveAvailable.value = contextId ? retryPatchByContext.has(contextId) : false
	}

	function getOrCreateBucket(contextId: TContextId) {
		const existing = bucketByContext.get(contextId)
		if (existing) return existing
		const created: PatchQueueBucket<TPatch> = {
			stagedPatch: options.createEmptyPatch(),
			queueRunning: false,
		}
		bucketByContext.set(contextId, created)
		return created
	}

	function clearContextBucket(contextId: TContextId) {
		const bucket = bucketByContext.get(contextId)
		if (!bucket) return
		if (bucket.queueRunning) return
		if (options.hasPatchValue(bucket.stagedPatch)) return
		if (retryPatchByContext.has(contextId)) return
		bucketByContext.delete(contextId)
	}

	function stagePatch(contextId: TContextId | null, patch: TPatch): boolean {
		if (!contextId || !options.hasPatchValue(patch)) return false
		const bucket = getOrCreateBucket(contextId)
		bucket.stagedPatch = options.mergePatch(bucket.stagedPatch, patch)
		return true
	}

	function hasQueuedPatch(contextId: TContextId | null): boolean {
		if (!contextId) return false
		const bucket = bucketByContext.get(contextId)
		if (!bucket) return false
		return options.hasPatchValue(bucket.stagedPatch)
	}

	async function processQueuedPatches(contextId: TContextId | null) {
		if (!contextId) return
		const bucket = getOrCreateBucket(contextId)
		if (bucket.queueRunning) return
		bucket.queueRunning = true

		try {
			while (options.hasPatchValue(bucket.stagedPatch)) {
				const nextPatch = bucket.stagedPatch
				bucket.stagedPatch = options.createEmptyPatch()

				if (options.isContextActive && !options.isContextActive(contextId)) {
					options.onDiscardedPatch?.(contextId, nextPatch)
					continue
				}

				beginSave()
				let ok = false
				try {
					ok = await options.commitPatch(contextId, nextPatch)
				} catch (error) {
					console.error('[PatchQueue] commit failed', error)
					ok = false
				}
				endSave(ok)

				if (!ok) {
					bucket.stagedPatch = options.mergePatch(nextPatch, bucket.stagedPatch)
					retryPatchByContext.set(contextId, options.clonePatch(nextPatch))
					syncRetrySaveAvailability()
					break
				}

				retryPatchByContext.delete(contextId)
				syncRetrySaveAvailability()
			}
		} finally {
			bucket.queueRunning = false
			if (options.hasPatchValue(bucket.stagedPatch) && activeContextId.value === contextId) {
				void processQueuedPatches(contextId)
				return
			}
			clearContextBucket(contextId)
		}
	}

	function queuePatch(contextId: TContextId | null, patch: TPatch) {
		if (!stagePatch(contextId, patch)) return
		void processQueuedPatches(contextId)
	}

	async function flushPendingPatches(contextId: TContextId | null = activeContextId.value) {
		await processQueuedPatches(contextId)
	}

	async function retrySave(contextId: TContextId | null = activeContextId.value) {
		if (!contextId) return
		const retryPatch = retryPatchByContext.get(contextId)
		if (!retryPatch) return
		queuePatch(contextId, retryPatch)
		await processQueuedPatches(contextId)
	}

	function cleanupInactiveContexts(nextActiveContextId: TContextId | null) {
		for (const [contextId, bucket] of bucketByContext.entries()) {
			if (contextId === nextActiveContextId) continue
			if (bucket.queueRunning) continue
			if (options.hasPatchValue(bucket.stagedPatch)) {
				options.onDiscardedPatch?.(contextId, bucket.stagedPatch)
			}
			bucketByContext.delete(contextId)
		}
		for (const contextId of retryPatchByContext.keys()) {
			if (contextId === nextActiveContextId) continue
			retryPatchByContext.delete(contextId)
		}
	}

	function setActiveContext(contextId: TContextId | null) {
		activeContextId.value = contextId
		cleanupInactiveContexts(contextId)
		syncRetrySaveAvailability()
	}

	function clearAll() {
		bucketByContext.clear()
		retryPatchByContext.clear()
		activeContextId.value = null
		retrySaveAvailable.value = false
		pendingSaves.value = 0
		clearSaveStateTimer()
		saveState.value = 'idle'
	}

	return {
		saveState,
		retrySaveAvailable,
		activeContextId,
		queuePatch,
		flushPendingPatches,
		retrySave,
		hasQueuedPatch,
		setActiveContext,
		clearAll,
	}
}
