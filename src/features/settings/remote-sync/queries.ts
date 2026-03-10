import { useQuery } from '@pinia/colada'
import { computed, toRaw } from 'vue'

import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteDbProfile, RemoteSyncHistoryItem } from '@/types/shared/remote-sync'

import { remoteSyncQueryKeys } from './model'

async function ensureRemoteSyncStoreLoaded(remoteSyncStore: ReturnType<typeof useRemoteSyncStore>) {
	if (!remoteSyncStore.loaded) {
		await remoteSyncStore.load()
	}
}

function cloneProfile(profile: RemoteDbProfile): RemoteDbProfile {
	return {
		...toRaw(profile),
	}
}

function cloneSyncHistoryItem(item: RemoteSyncHistoryItem): RemoteSyncHistoryItem {
	const rawItem = toRaw(item)
	return {
		...rawItem,
		report: structuredClone(toRaw(rawItem.report)),
	}
}

export function useRemoteSyncProfilesQuery() {
	const remoteSyncStore = useRemoteSyncStore()

	const query = useQuery<RemoteDbProfile[]>({
		key: remoteSyncQueryKeys.profiles.list(),
		query: async () => {
			await ensureRemoteSyncStoreLoaded(remoteSyncStore)
			return remoteSyncStore.profiles.map(cloneProfile)
		},
	})

	const profiles = computed(() => query.data.value ?? [])

	return {
		...query,
		profiles,
	}
}

export function useRemoteSyncHistoryQuery() {
	const remoteSyncStore = useRemoteSyncStore()

	const query = useQuery<RemoteSyncHistoryItem[]>({
		key: remoteSyncQueryKeys.history.list(),
		query: async () => {
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