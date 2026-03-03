import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteSyncHistoryItem } from '@/types/shared/remote-sync'

import { remoteSyncQueryKeys } from './query-keys'

async function ensureRemoteSyncStoreLoaded(remoteSyncStore: ReturnType<typeof useRemoteSyncStore>) {
	if (!remoteSyncStore.loaded) {
		await remoteSyncStore.load()
	}
}

function cloneSyncHistoryItem(item: RemoteSyncHistoryItem): RemoteSyncHistoryItem {
	return {
		...item,
		report: structuredClone(item.report),
	}
}

export function useRemoteSyncHistoryQuery() {
	const remoteSyncStore = useRemoteSyncStore()

	const query = useQuery<RemoteSyncHistoryItem[]>({
		queryKey: remoteSyncQueryKeys.history.list(),
		queryFn: async () => {
			await ensureRemoteSyncStoreLoaded(remoteSyncStore)
			return remoteSyncStore.syncHistory.map(cloneSyncHistoryItem)
		},
	})

	const syncHistory = computed(() => query.data.value ?? [])

	return {
		...query,
		syncHistory,
	}
}
