import { createGlobalState, useStorage } from '@vueuse/core'
import type { Ref } from 'vue'

const useStorageRegistry = createGlobalState(() => {
	const registry = new Map<string, Ref<unknown>>()

	function getStorageRef<T>(key: string, defaults: T): Ref<T> {
		const existing = registry.get(key) as Ref<T> | undefined
		if (existing) return existing

		const state = useStorage<T>(key, defaults)
		registry.set(key, state as Ref<unknown>)
		return state
	}

	return {
		getStorageRef,
	}
})

export function useSharedStorage<T>(key: string, defaults: T): Ref<T> {
	return useStorageRegistry().getStorageRef(key, defaults)
}
