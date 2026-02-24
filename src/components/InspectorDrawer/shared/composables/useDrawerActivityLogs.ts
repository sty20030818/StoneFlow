import { useAsyncState } from '@vueuse/core'
import { computed, watch, type Ref } from 'vue'

import type { ActivityLogEntry } from '@/services/api/logs'

export function useDrawerActivityLogs(params: {
	entityId: Ref<string | null>
	tick: Ref<number>
	loadLogs: (id: string) => Promise<ActivityLogEntry[]>
	errorFallbackText: string
}) {
	const {
		state: timelineLogs,
		isLoading: timelineLoading,
		error: timelineError,
		execute,
	} = useAsyncState(
		async (id: string) => {
			return await params.loadLogs(id)
		},
		[] as ActivityLogEntry[],
		{
			immediate: false,
			resetOnExecute: false,
		},
	)

	const timelineErrorMessage = computed(() => {
		if (!params.entityId.value) return null
		const error = timelineError.value
		if (!error) return null
		return error instanceof Error ? error.message : params.errorFallbackText
	})

	const timelineEmpty = computed(() => {
		return !timelineLoading.value && !timelineError.value && timelineLogs.value.length === 0
	})

	async function reloadTimeline() {
		const id = params.entityId.value
		if (!id) {
			timelineLogs.value = []
			return
		}
		await execute(0, id)
	}

	watch(
		params.entityId,
		() => {
			void reloadTimeline()
		},
		{ immediate: true },
	)

	watch(
		() => params.tick.value,
		() => {
			if (!params.entityId.value) return
			void reloadTimeline()
		},
	)

	return {
		timelineLogs,
		timelineLoading,
		timelineErrorMessage,
		timelineEmpty,
		reloadTimeline,
	}
}
