import { useQuery } from '@pinia/colada'
import { computed } from 'vue'

import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteDbProfile } from '@/types/shared/remote-sync'

import { remoteSyncQueryKeys } from './query-keys'

async function ensureRemoteSyncStoreLoaded(remoteSyncStore: ReturnType<typeof useRemoteSyncStore>) {
	if (!remoteSyncStore.loaded) {
		await remoteSyncStore.load()
	}
}

function cloneProfile(profile: RemoteDbProfile): RemoteDbProfile {
	return {
		...profile,
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
